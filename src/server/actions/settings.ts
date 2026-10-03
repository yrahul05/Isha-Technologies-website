'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { rolePermissions, sessions, users } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerForPasswordChange, requireViewerOrThrow } from '@/server/auth/viewer';
import { hashPassword, passwordProblems, verifyPassword } from '@/server/auth/password';
import { revokeAllSessions } from '@/server/auth/session';
import { generateTotpSecret, verifyTotp } from '@/server/auth/totp';
import { decryptSecret, encryptSecret } from '@/server/security/crypto';
import { audit } from '@/server/audit';
import { DEFAULT_SETTINGS, getSetting, saveSetting, type SettingsMap } from '@/server/settings';
import { sendEmail } from '@/lib/email';
import { portalEmailHtml } from '@/server/notify';
import { EDITABLE_ROLES, PERMISSIONS, type Permission } from '@/lib/portal/permissions';
import { guarded, parseForm } from './helpers';
import { isLoginThrottled, recordLoginAttempt } from '@/server/auth/throttle';
import { notifySecurity } from '@/server/auth/security-notice';
import { getRequestMeta } from '@/server/request';
import { PREFERENCE_CATEGORIES } from '@/lib/portal/notification-prefs';
import { TIMEZONES } from '@/lib/portal/profile';
import type { ActionState } from './types';

// ─── My account ──────────────────────────────────────────────────────────
export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(
      z.object({
        name: z.string().trim().min(2, 'Enter your name.').max(120),
        phone: z.string().trim().max(40).optional().transform((v) => v || null),
        title: z.string().trim().max(120).optional().transform((v) => v || null),
        timezone: z.string().refine((tz) => TIMEZONES.some((t) => t.value === tz), 'Choose a timezone.'),
        emailNotifications: z.string().optional(),
      }),
      form
    );
    if (parsed.error) return parsed.error;
    await db
      .update(users)
      .set({ name: parsed.data.name, phone: parsed.data.phone, title: parsed.data.title, timezone: parsed.data.timezone, emailNotifications: parsed.data.emailNotifications === 'on' })
      .where(eq(users.id, viewer.id));
    await audit(viewer, 'user.updated', { entityType: 'user', entityId: viewer.id, metadata: { self: true } });
    revalidatePath('/portal', 'layout');
    return { ok: true, message: 'Profile saved.' };
  });
}

/**
 * Change your own password: current + new + confirm. The current password is
 * verified server-side (scrypt, constant-time), attempts are rate limited, the
 * new password is hashed immediately, and nothing secret is ever echoed,
 * logged or audited. Also the way out of an admin-forced password change.
 */
export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let wasForced = false;
  const result = await guarded(async (): Promise<ActionState> => {
    const viewer = await requireViewerForPasswordChange();
    const meta = await getRequestMeta();
    const current = String(form.get('current') ?? '');
    const next = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    const key = `pwchange:${viewer.id}`;
    if (await isLoginThrottled(key, meta.ip)) return { error: 'Too many incorrect attempts. Please wait 15 minutes.' };

    const [user] = await db.select().from(users).where(eq(users.id, viewer.id));
    if (!(await verifyPassword(current, user.passwordHash))) {
      await recordLoginAttempt(key, meta.ip, false);
      await audit(viewer, 'auth.login_failed', { entityType: 'user', entityId: viewer.id, metadata: { context: 'password_change' }, meta });
      return { fieldErrors: { current: 'Current password is incorrect.' } };
    }
    const problem = passwordProblems(next);
    if (problem) return { fieldErrors: { password: problem } };
    if (next !== confirm) return { fieldErrors: { confirm: 'Passwords do not match.' } };
    if (await verifyPassword(next, user.passwordHash)) return { fieldErrors: { password: 'Choose a password you have not used for this account.' } };

    wasForced = user.forcePasswordChange;
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date(), forcePasswordChange: false })
      .where(eq(users.id, viewer.id));
    await recordLoginAttempt(key, meta.ip, true);
    await revokeAllSessions(viewer.id, viewer.sessionId); // sign out every other device
    await audit(viewer, 'auth.password_changed', { entityType: 'user', entityId: viewer.id, metadata: { wasForced }, meta });
    await notifySecurity(viewer, 'Your password was changed', 'Your portal password was changed and your other devices were signed out. If this was not you, contact your administrator immediately.', meta);
    return { ok: true, message: 'Password changed. Other devices have been signed out.' };
  });
  if (result.ok && wasForced) redirect('/portal/dashboard');
  return result;
}

export async function saveNotificationPrefsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const prefs: Record<string, boolean> = {};
    for (const c of PREFERENCE_CATEGORIES) if (!c.locked) prefs[c.key] = form.get(`pref_${c.key}`) === 'on';
    await db.update(users).set({ notificationPrefs: prefs }).where(eq(users.id, viewer.id));
    await audit(viewer, 'user.updated', { entityType: 'user', entityId: viewer.id, metadata: { notificationPrefs: prefs } });
    revalidatePath('/portal/settings');
    return { ok: true, message: 'Notification preferences saved.' };
  });
}

/** Step 1: create a pending TOTP secret (not active until confirmed with a valid code). */
export async function beginTotpSetupAction(): Promise<{ secret: string; uri: string; qr: string } | { error: string }> {
  const viewer = await requireViewerOrThrow();
  if (viewer.totpEnabled) return { error: 'Two-step verification is already on.' };
  const secret = generateTotpSecret();
  await db.update(users).set({ totpSecretEnc: encryptSecret(secret), totpEnabled: false }).where(eq(users.id, viewer.id));
  const { totpUri } = await import('@/server/auth/totp');
  const uri = totpUri(secret, viewer.email);
  const QR = await import('qrcode');
  const qr = await QR.toString(uri, { type: 'svg', margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
  return { secret, uri, qr };
}

export async function confirmTotpAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const [user] = await db.select().from(users).where(eq(users.id, viewer.id));
    if (!user.totpSecretEnc) return { error: 'Start setup again.' };
    const code = String(form.get('code') ?? '').replace(/\s/g, '');
    if (!verifyTotp(decryptSecret(user.totpSecretEnc), code)) return { fieldErrors: { code: 'That code is not valid. Check the time on your phone and try again.' } };
    await db.update(users).set({ totpEnabled: true }).where(eq(users.id, viewer.id));
    await audit(viewer, 'auth.mfa_enabled', { entityType: 'user', entityId: viewer.id });
    revalidatePath('/portal/settings');
    return { ok: true, message: 'Two-step verification is on.' };
  });
}

export async function disableTotpAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const [user] = await db.select().from(users).where(eq(users.id, viewer.id));
    if (!(await verifyPassword(String(form.get('password') ?? ''), user.passwordHash))) return { fieldErrors: { password: 'Password is incorrect.' } };
    const security = await getSetting('security');
    if (security.enforceMfaForInternal && viewer.isInternal) return { error: 'Two-step verification is required for team accounts.' };
    await db.update(users).set({ totpEnabled: false, totpSecretEnc: null }).where(eq(users.id, viewer.id));
    await audit(viewer, 'auth.mfa_disabled', { entityType: 'user', entityId: viewer.id });
    revalidatePath('/portal/settings');
    return { ok: true, message: 'Two-step verification turned off.' };
  });
}

export async function revokeSessionAction(sessionId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (sessionId === viewer.sessionId) return { error: 'Use Sign out for this device.' };
    await db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, viewer.id)));
    revalidatePath('/portal/settings');
    return { ok: true };
  });
}

export async function revokeOtherSessionsAction(): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    await db.delete(sessions).where(and(eq(sessions.userId, viewer.id), ne(sessions.id, viewer.sessionId)));
    revalidatePath('/portal/settings');
    return { ok: true, message: 'All other sessions signed out.' };
  });
}

// ─── System settings (settings.manage) ───────────────────────────────────
const SECTION_SCHEMAS = {
  company: z.object({
    name: z.string().trim().min(2).max(160),
    legalName: z.string().trim().max(200),
    email: z.email(),
    phone: z.string().trim().max(40),
    website: z.string().trim().max(200),
    addressLine1: z.string().trim().max(200),
    addressLine2: z.string().trim().max(200),
    city: z.string().trim().max(80),
    state: z.string().trim().max(80),
    postalCode: z.string().trim().max(20),
    country: z.string().trim().max(80),
  }),
  tax: z
    .object({
      gstin: z.string().trim().toUpperCase().max(15),
      pan: z.string().trim().toUpperCase().max(10),
      stateCode: z.string().regex(/^\d{2}$/, 'Two-digit GST state code'),
      gstRates: z
        .string()
        .transform((v) => [...new Set(v.split(',').map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n >= 0 && n <= 100))].sort((a, b) => a - b))
        .refine((a) => a.length > 0, 'Enter at least one rate, e.g. 0, 5, 12, 18, 28'),
      defaultTaxRatePct: z.coerce.number().min(0).max(100),
      sacCode: z.string().trim().max(12),
      internationalTaxLabel: z.string().trim().min(1).max(40),
      internationalTaxRatePct: z.coerce.number().min(0).max(100),
    })
    .refine((d) => d.gstRates.includes(d.defaultTaxRatePct), { path: ['defaultTaxRatePct'], message: 'The default GST rate must be one of the configured rates.' }),
  invoice: z.object({
    prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,8}$/, 'Letters and numbers only (max 8)'),
    defaultCurrency: z.enum(['INR', 'USD', 'CAD']),
    defaultDueDays: z.coerce.number().int().min(0).max(180),
    defaultTerms: z.string().max(4000),
    defaultNotes: z.string().max(2000),
    footer: z.string().trim().max(200),
    signatoryName: z.string().trim().max(120),
    signatoryTitle: z.string().trim().max(120),
  }),
  currencies: z.object({
    INR: z.string().trim().min(1).max(4),
    USD: z.string().trim().min(1).max(4),
    CAD: z.string().trim().min(1).max(4),
  }),
  // Flat form fields (d_bankName, d_show_bankName, i_swift, …) → nested profiles.
  payment: z.preprocess(
    (raw) => {
      const r = raw as Record<string, string>;
      const profile = (p: 'd' | 'i', keys: string[]) => ({
        ...Object.fromEntries(keys.map((k) => [k, (r[`${p}_${k}`] ?? '').trim()])),
        show: Object.fromEntries(keys.map((k) => [k, r[`${p}_show_${k}`] === 'on'])),
      });
      return {
        domestic: profile('d', ['bankName', 'accountName', 'accountNumber', 'ifsc', 'branch', 'upiId']),
        international: profile('i', ['bankName', 'accountName', 'accountNumber', 'swift', 'iban', 'routing', 'bankAddress', 'instructions']),
      };
    },
    z.object({
      domestic: z.object({
        bankName: z.string().max(120),
        accountName: z.string().max(120),
        accountNumber: z.string().max(40),
        ifsc: z.string().max(15).transform((v) => v.toUpperCase()),
        branch: z.string().max(120),
        upiId: z.string().max(80),
        show: z.record(z.string(), z.boolean()),
      }),
      international: z.object({
        bankName: z.string().max(120),
        accountName: z.string().max(120),
        accountNumber: z.string().max(40),
        swift: z
          .string()
          .max(11)
          .transform((v) => v.toUpperCase())
          .refine((v) => !v || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v), 'SWIFT/BIC is 8 or 11 characters (e.g. HDFCINBBXXX)'),
        iban: z
          .string()
          .max(34)
          .transform((v) => v.replace(/\s+/g, '').toUpperCase())
          .refine((v) => !v || /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v), 'That IBAN doesn’t look valid'),
        routing: z.string().max(40),
        bankAddress: z.string().max(300),
        instructions: z.string().max(600),
        show: z.record(z.string(), z.boolean()),
      }),
    })
  ),
  notifications: z.object({
    soundEnabled: z.string().optional().transform((v) => v === 'on'),
    pollSeconds: z.coerce.number().int().min(10).max(300),
    emailHighPriority: z.string().optional().transform((v) => v === 'on'),
  }),
  leads: z.object({
    defaultAssigneeId: z.union([z.literal(''), z.uuid()]).transform((v) => v || null),
    roundRobin: z.string().optional().transform((v) => v === 'on'),
  }),
  storage: z.object({ maxUploadMb: z.coerce.number().int().min(1).max(100) }),
  security: z.object({ enforceMfaForInternal: z.string().optional().transform((v) => v === 'on') }),
  branding: z.object({ portalName: z.string().trim().min(2).max(80), accentHex: z.literal('#3478e4').default('#3478e4') }),
} satisfies { [K in keyof SettingsMap]: z.ZodType };

export async function saveSettingsSectionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'settings.manage');
    const section = String(form.get('section')) as keyof SettingsMap;
    if (!(section in SECTION_SCHEMAS)) return { error: 'Unknown section.' };
    const parsed = parseForm(SECTION_SCHEMAS[section] as z.ZodType, form);
    if (parsed.error) return parsed.error;
    await saveSetting(section, { ...DEFAULT_SETTINGS[section], ...(parsed.data as object) } as SettingsMap[typeof section], viewer.id);
    await audit(viewer, 'settings.updated', { entityType: 'settings', entityId: section });
    revalidatePath('/portal/settings');
    return { ok: true, message: 'Settings saved.' };
  });
}

/** Role permission matrix — Super Admin only, Admin/Employee roles only. */
export async function saveRolePermissionsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!viewer.isSuperAdmin) throw new ForbiddenError('Only a Super Admin can change role permissions.');
    const role = String(form.get('role'));
    if (!EDITABLE_ROLES.includes(role as (typeof EDITABLE_ROLES)[number])) return { error: 'That role can’t be edited.' };
    const valid = new Set(PERMISSIONS.map((p) => p.key));
    const wanted = form.getAll('permissions').map(String).filter((p): p is Permission => valid.has(p as Permission));
    const before = (await db.select({ p: rolePermissions.permission }).from(rolePermissions).where(eq(rolePermissions.role, role as 'admin'))).map((r) => r.p);

    await db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.role, role as 'admin'));
      if (wanted.length) await tx.insert(rolePermissions).values(wanted.map((permission) => ({ role: role as 'admin', permission })));
    });
    // Existing sessions pick the change up on their next request (permissions are read per request).
    await audit(viewer, 'role.permissions_changed', {
      entityType: 'role',
      entityId: role,
      metadata: { added: wanted.filter((p) => !before.includes(p)), removed: before.filter((p) => !wanted.includes(p as Permission)) },
    });
    revalidatePath('/portal/settings');
    return { ok: true, message: `${role === 'admin' ? 'Admin' : 'Team member'} permissions saved.` };
  });
}

export async function sendTestEmailAction(): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'settings.manage');
    const from = process.env.EMAIL_FROM;
    if (!process.env.EMAIL_API_KEY || !from) return { error: 'EMAIL_API_KEY / EMAIL_FROM are not configured.' };
    const r = await sendEmail({ to: viewer.email, from, subject: 'Portal test email', text: 'Email delivery from the Isha Technologies portal works.', html: portalEmailHtml('Portal test email', 'Email delivery from the Isha Technologies portal works.', '/', 'Open portal') });
    return r.ok ? { ok: true, message: `Test email sent to ${viewer.email}.` } : { error: 'Email provider rejected the request — check the server logs.' };
  });
}

