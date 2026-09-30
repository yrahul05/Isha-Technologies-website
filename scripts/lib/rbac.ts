import { sql } from 'drizzle-orm';
import type { Database } from '../../src/server/db';
import { permissions, rolePermissions, roles } from '../../src/server/db/schema';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_LABELS, ROLE_KEYS } from '../../src/lib/portal/permissions';

const ROLE_DESCRIPTIONS = {
  super_admin: 'Complete control of the platform, including settings and audit logs.',
  admin: 'Runs day-to-day operations. Permissions are configurable.',
  employee: 'Sees only the projects, tasks and documents assigned to them.',
  client: 'Sees only their own company account.',
} as const;

/**
 * Idempotent: upserts roles & the permission catalogue. Default grants are
 * inserted only for roles that have no grants yet, so edits made in
 * Settings → Roles & Permissions survive redeploys. Super Admin always
 * receives every permission.
 */
export async function syncRbac(db: Database) {
  for (const key of ROLE_KEYS) {
    await db
      .insert(roles)
      .values({ key, name: ROLE_LABELS[key], description: ROLE_DESCRIPTIONS[key] })
      .onConflictDoUpdate({ target: roles.key, set: { name: ROLE_LABELS[key], description: ROLE_DESCRIPTIONS[key] } });
  }
  for (const p of PERMISSIONS) {
    await db
      .insert(permissions)
      .values({ key: p.key, label: p.label, group: p.group })
      .onConflictDoUpdate({ target: permissions.key, set: { label: p.label, group: p.group } });
  }
  for (const role of ROLE_KEYS) {
    const existing = await db.execute(sql`select count(*)::int as n from role_permissions where role = ${role}`);
    const n = Number((existing as unknown as { rows?: { n: number }[] }).rows?.[0]?.n ?? (existing as unknown as { n: number }[])[0]?.n ?? 0);
    if (role === 'super_admin' || n === 0) {
      for (const permission of DEFAULT_ROLE_PERMISSIONS[role]) {
        await db.insert(rolePermissions).values({ role, permission }).onConflictDoNothing();
      }
    }
  }
}
