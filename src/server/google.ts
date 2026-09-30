import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { googleAccounts } from '@/server/db/schema';
import { decryptSecret, encryptSecret } from '@/server/security/crypto';
import { appUrl } from '@/server/request';

/**
 * Google Calendar + Meet integration (per user).
 *
 * OAuth 2.0 authorization-code flow with offline access. Only the
 * `calendar.events` scope is requested (create/update/delete events the
 * user organises), plus `openid email` to show which account is linked.
 * The refresh token is stored AES-256-GCM encrypted; access tokens are
 * refreshed server-side and never leave the server.
 */
export const GOOGLE_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events'];

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI || `${appUrl()}/api/portal/google/callback`;
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; scope: string; id_token?: string; error?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
  });
  const json = (await res.json()) as TokenResponse & { error_description?: string };
  if (!res.ok) throw new Error(`Google token endpoint: ${json.error ?? res.status} ${json.error_description ?? ''}`.trim());
  return json;
}

/** Completes the OAuth flow and stores the (encrypted) tokens for the user. */
export async function connectGoogleAccount(userId: string, code: string): Promise<string> {
  const tokens = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: googleRedirectUri() });
  if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Remove the app from your Google account permissions and connect again.');
  if (!tokens.scope.includes('calendar.events')) throw new Error('Calendar permission was not granted.');
  // The id_token came straight from Google's token endpoint over TLS, so its
  // payload can be read without re-verifying the signature (OIDC §3.1.3.7).
  const email = tokens.id_token ? (JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString()) as { email?: string }).email : undefined;
  const values = {
    googleEmail: email ?? 'unknown',
    refreshTokenEnc: encryptSecret(tokens.refresh_token),
    accessTokenEnc: encryptSecret(tokens.access_token),
    accessTokenExpiresAt: new Date(Date.now() + (tokens.expires_in - 60) * 1000),
    scope: tokens.scope,
  };
  await db.insert(googleAccounts).values({ userId, ...values }).onConflictDoUpdate({ target: googleAccounts.userId, set: { ...values, connectedAt: new Date() } });
  return values.googleEmail;
}

export async function getGoogleAccount(userId: string) {
  const [row] = await db.select({ googleEmail: googleAccounts.googleEmail, connectedAt: googleAccounts.connectedAt }).from(googleAccounts).where(eq(googleAccounts.userId, userId));
  return row ?? null;
}

async function accessToken(userId: string): Promise<string | null> {
  const [row] = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, userId));
  if (!row) return null;
  if (row.accessTokenEnc && row.accessTokenExpiresAt && row.accessTokenExpiresAt > new Date()) return decryptSecret(row.accessTokenEnc);
  const tokens = await tokenRequest({ refresh_token: decryptSecret(row.refreshTokenEnc), grant_type: 'refresh_token' });
  await db
    .update(googleAccounts)
    .set({ accessTokenEnc: encryptSecret(tokens.access_token), accessTokenExpiresAt: new Date(Date.now() + (tokens.expires_in - 60) * 1000) })
    .where(eq(googleAccounts.userId, userId));
  return tokens.access_token;
}

export async function disconnectGoogleAccount(userId: string): Promise<void> {
  const [row] = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, userId));
  if (!row) return;
  // Best-effort revoke at Google, then forget the tokens locally regardless.
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decryptSecret(row.refreshTokenEnc))}`, { method: 'POST' }).catch(() => undefined);
  await db.delete(googleAccounts).where(eq(googleAccounts.userId, userId));
}

export type CalendarEventInput = {
  requestId: string;
  summary: string;
  description: string;
  start: Date;
  durationMinutes: number;
  attendees: string[];
};

type GoogleEvent = { id: string; hangoutLink?: string; htmlLink?: string; conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] } };

async function calendarFetch(userId: string, path: string, init: RequestInit): Promise<Response> {
  const token = await accessToken(userId);
  if (!token) throw new Error('Google Calendar is not connected for this user.');
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

function eventBody(e: CalendarEventInput, withConference: boolean) {
  return {
    summary: e.summary,
    description: e.description,
    start: { dateTime: e.start.toISOString(), timeZone: 'Asia/Kolkata' },
    end: { dateTime: new Date(e.start.getTime() + e.durationMinutes * 60_000).toISOString(), timeZone: 'Asia/Kolkata' },
    attendees: e.attendees.map((email) => ({ email })),
    reminders: { useDefault: true },
    ...(withConference ? { conferenceData: { createRequest: { requestId: e.requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } } } : {}),
  };
}

/** Creates the event on the organiser's primary calendar with an auto-generated Google Meet link. */
export async function createMeetEvent(userId: string, e: CalendarEventInput): Promise<{ eventId: string; meetLink: string | null }> {
  const res = await calendarFetch(userId, 'events?conferenceDataVersion=1&sendUpdates=all', { method: 'POST', body: JSON.stringify(eventBody(e, true)) });
  if (!res.ok) throw new Error(`Google Calendar error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const ev = (await res.json()) as GoogleEvent;
  const meetLink = ev.hangoutLink ?? ev.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri ?? null;
  return { eventId: ev.id, meetLink };
}

export async function updateMeetEvent(userId: string, eventId: string, e: CalendarEventInput): Promise<void> {
  const res = await calendarFetch(userId, `events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`, { method: 'PATCH', body: JSON.stringify(eventBody(e, false)) });
  if (!res.ok) throw new Error(`Google Calendar error ${res.status}`);
}

export async function cancelMeetEvent(userId: string, eventId: string): Promise<void> {
  const res = await calendarFetch(userId, `events/${encodeURIComponent(eventId)}?sendUpdates=all`, { method: 'DELETE' });
  if (!res.ok && res.status !== 410 && res.status !== 404) throw new Error(`Google Calendar error ${res.status}`);
}
