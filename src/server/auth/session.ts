import 'server-only';
import { and, eq, gt, lt, ne, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/server/db';
import { clientUsers, clients, sessions, users } from '@/server/db/schema';
import { randomToken, sha256 } from '@/server/security/crypto';
import { SESSION_COOKIE } from '@/lib/portal/session-cookie';
import type { RequestMeta } from '@/server/request';

/**
 * Day-scoped sessions: a login lasts until the next midnight in the
 * business timezone (IST by default), so users sign in once per working
 * day. A minimum lifetime stops a 23:50 login from expiring ten minutes
 * later. Sessions live in the database, so logout, deactivation and
 * password changes revoke them immediately.
 */
const TZ_OFFSET_MINUTES = Number(process.env.SESSION_TZ_OFFSET_MINUTES ?? 330); // IST = UTC+5:30
const MIN_LIFETIME_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function sessionExpiry(now = new Date()): Date {
  const offset = TZ_OFFSET_MINUTES * 60 * 1000;
  const localNow = now.getTime() + offset;
  const nextLocalMidnight = Math.floor(localNow / DAY_MS) * DAY_MS + DAY_MS;
  const expiry = nextLocalMidnight - offset;
  return new Date(Math.max(expiry, now.getTime() + MIN_LIFETIME_MS));
}

export async function createSession(
  userId: string,
  meta: RequestMeta,
  opts: { mfaVerified?: boolean } = {}
): Promise<void> {
  const token = randomToken(32);
  const expiresAt = sessionExpiry();
  await db.insert(sessions).values({
    id: sha256(token),
    userId,
    expiresAt,
    ip: meta.ip,
    userAgent: meta.userAgent,
    mfaVerified: opts.mfaVerified ?? true,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/** Role grants and tenant membership fetched in the same round-trip as the session (see readSession). */
export type SessionPrefetch = {
  permissions: string[];
  membership: { clientId: string; role: 'owner' | 'member'; name: string; status: string } | null;
};

export type SessionRecord = {
  sessionId: string;
  mfaVerified: boolean;
  user: typeof users.$inferSelect;
  prefetch: SessionPrefetch;
};

/**
 * Validates the cookie against the DB. Returns null for missing/expired/revoked sessions or inactive users.
 *
 * ONE round-trip returns everything the Viewer needs: the session row, the user, the role's permission
 * grants (correlated subquery) and the client-tenant membership. It is always read fresh and never cached,
 * so revocation, deactivation and permission edits apply on the very next request. (This used to be 2–3
 * sequential queries on every page, action and API call.)
 */
export async function readSession(): Promise<SessionRecord | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;

  const sessionId = sha256(token);
  const [row] = await db
    .select({
      session: sessions,
      user: users,
      permissions: sql<string[] | null>`(select json_agg(rp.permission) from role_permissions rp where rp.role = ${users.role})`,
      memberClientId: clientUsers.clientId,
      memberRole: clientUsers.role,
      memberName: clients.companyName,
      memberStatus: clients.status,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(clientUsers, eq(clientUsers.userId, users.id))
    .leftJoin(clients, eq(clients.id, clientUsers.clientId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row || !row.user.isActive) return null;

  // Touch at most every 5 minutes — keeps "last seen" useful without a write per request.
  if (Date.now() - row.session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, sessionId));
  }

  const membership =
    row.memberClientId && row.memberRole && row.memberName != null && row.memberStatus
      ? { clientId: row.memberClientId, role: row.memberRole, name: row.memberName, status: row.memberStatus }
      : null;
  return {
    sessionId,
    mfaVerified: row.session.mfaVerified,
    user: row.user,
    prefetch: { permissions: Array.isArray(row.permissions) ? row.permissions : [], membership },
  };
}

export async function markSessionMfaVerified(sessionId: string): Promise<void> {
  await db.update(sessions).set({ mfaVerified: true }).where(eq(sessions.id, sessionId));
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await db.delete(sessions).where(and(eq(sessions.userId, userId), exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined));
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
