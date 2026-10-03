import 'server-only';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/server/db';
import { clientUsers, clients, rolePermissions, users } from '@/server/db/schema';
import { readSession } from './session';
import { INTERNAL_ONLY_PERMISSIONS, type Permission, type RoleKey } from '@/lib/portal/permissions';

/**
 * The authenticated principal for the current request. Built once per
 * request (React `cache`) from the session cookie → DB. Every query and
 * mutation in src/server receives a Viewer and scopes itself with it; no
 * role or permission ever comes from the browser.
 */
export type Viewer = {
  id: string;
  email: string;
  name: string;
  role: RoleKey;
  title: string | null;
  /** Set for client-role users only; null means "no tenant" → sees nothing. */
  clientId: string | null;
  clientName: string | null;
  clientRole: 'owner' | 'member' | null;
  permissions: ReadonlySet<Permission>;
  isInternal: boolean;
  isSuperAdmin: boolean;
  sessionId: string;
  totpEnabled: boolean;
  /** IANA timezone used for dates in the UI and emails. */
  timezone: string;
  /** Authenticated avatar URL (cache-busted by the stored key), or null for initials. */
  avatarUrl: string | null;
};

export class ForbiddenError extends Error {
  constructor(message = 'You do not have access to this resource.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function avatarUrlFor(userId: string, avatarKey: string | null): string | null {
  return avatarKey ? `/api/portal/avatars/${userId}?v=${avatarKey.slice(-8)}` : null;
}

/** Where an admin-reset account must go before it can use anything else. */
export const CHANGE_PASSWORD_PATH = '/portal/settings/security/change-password';

const loadViewer = cache(async (): Promise<{ viewer: Viewer | null; mfaPending: boolean; mustChangePassword: boolean }> => {
  const session = await readSession();
  if (!session) return { viewer: null, mfaPending: false, mustChangePassword: false };
  const viewer = await buildViewer(session.user, session.sessionId);
  if (!viewer) return { viewer: null, mfaPending: false, mustChangePassword: false };
  if (!session.mfaVerified) return { viewer: null, mfaPending: true, mustChangePassword: false };
  return { viewer, mfaPending: false, mustChangePassword: session.user.forcePasswordChange };
});

/** Resolves role permissions and tenant membership for a user. Null = no access. */
export async function buildViewer(user: typeof users.$inferSelect, sessionId: string): Promise<Viewer | null> {
  if (!user.isActive) return null;

  const granted = await db
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(eq(rolePermissions.role, user.role));

  let clientId: string | null = null;
  let clientName: string | null = null;
  let clientRole: Viewer['clientRole'] = null;
  if (user.role === 'client') {
    const [membership] = await db
      .select({ clientId: clientUsers.clientId, role: clientUsers.role, name: clients.companyName, status: clients.status })
      .from(clientUsers)
      .innerJoin(clients, eq(clients.id, clientUsers.clientId))
      .where(eq(clientUsers.userId, user.id))
      .limit(1);
    // A deactivated client account locks out all of its users.
    if (membership && membership.status !== 'inactive') {
      clientId = membership.clientId;
      clientName = membership.name;
      clientRole = membership.role;
    } else {
      return null;
    }
  }

  const isInternal = user.role !== 'client';
  const permissions = new Set<Permission>(
    granted
      .map((g) => g.permission as Permission)
      // Defence in depth: clients never hold internal permissions.
      .filter((p) => isInternal || !INTERNAL_ONLY_PERMISSIONS.has(p))
  );

  const viewer: Viewer = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    title: user.title,
    timezone: user.timezone,
    avatarUrl: avatarUrlFor(user.id, user.avatarKey),
    clientId,
    clientName,
    clientRole,
    permissions,
    isInternal,
    isSuperAdmin: user.role === 'super_admin',
    sessionId,
    totpEnabled: user.totpEnabled,
  };
  return viewer;
}

/**
 * The current viewer, or null. Never redirects. A user who must change an
 * admin-set password is treated as NOT signed in here, so every API route,
 * download and assistant call refuses them until they have chosen their own
 * password (only the change-password page/action use the *ForPasswordChange helpers).
 */
export async function getViewer(): Promise<Viewer | null> {
  const l = await loadViewer();
  return l.viewer && !l.mustChangePassword ? l.viewer : null;
}

/** Viewer even when a password change is pending — only for the change-password page and action. */
export async function requireViewerForPasswordChange(): Promise<Viewer> {
  const { viewer } = await loadViewer();
  if (!viewer) throw new ForbiddenError('Your session has expired. Please sign in again.');
  return viewer;
}

export async function mustChangePassword(): Promise<boolean> {
  const l = await loadViewer();
  return Boolean(l.viewer && l.mustChangePassword);
}

export async function isMfaPending(): Promise<boolean> {
  return (await loadViewer()).mfaPending;
}

/** For pages/layouts: redirect to login when unauthenticated. */
export async function requireViewer(): Promise<Viewer> {
  const { viewer, mfaPending, mustChangePassword: forced } = await loadViewer();
  // Imported lazily so this module stays loadable outside the Next runtime (scripts/tests).
  const { redirect } = await import('next/navigation');
  if (mfaPending) return redirect('/portal/login/verify');
  if (!viewer) return redirect('/portal/login');
  if (forced) {
    // Server-side: nothing but the change-password page renders until the password is changed.
    const { headers } = await import('next/headers');
    const path = (await headers()).get('x-portal-path') ?? '';
    if (path !== CHANGE_PASSWORD_PATH) return redirect(CHANGE_PASSWORD_PATH);
  }
  return viewer;
}

/** For server actions / route handlers: throw instead of redirecting. */
export async function requireViewerOrThrow(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new ForbiddenError('Your session has expired. Please sign in again.');
  return viewer;
}

export function can(viewer: Viewer, permission: Permission): boolean {
  if (viewer.isSuperAdmin) return true;
  if (!viewer.isInternal) return false;
  return viewer.permissions.has(permission);
}

export function assertCan(viewer: Viewer, permission: Permission): void {
  if (!can(viewer, permission)) throw new ForbiddenError();
}

/** Page guard: 404 rather than 403 so restricted areas aren't discoverable. */
export async function requirePermission(permission: Permission): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!can(viewer, permission)) {
    const { notFound } = await import('next/navigation');
    notFound();
  }
  return viewer;
}

export async function requireInternal(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isInternal) {
    const { notFound } = await import('next/navigation');
    notFound();
  }
  return viewer;
}
