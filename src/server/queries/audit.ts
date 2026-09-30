import 'server-only';
import { and, desc, eq, gte, ilike, lte, or, type SQL } from 'drizzle-orm';
import { db } from '@/server/db';
import { auditLogs } from '@/server/db/schema';

export type AuditFilters = { action?: string; actor?: string; from?: string; to?: string; q?: string };

export function auditWhere(f: AuditFilters): SQL | undefined {
  const esc = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
  return and(
    f.action ? ilike(auditLogs.action, `${esc(f.action)}%`) : undefined,
    f.actor ? ilike(auditLogs.actorEmail, `%${esc(f.actor)}%`) : undefined,
    /^\d{4}-\d{2}-\d{2}$/.test(f.from ?? '') ? gte(auditLogs.createdAt, new Date(`${f.from}T00:00:00+05:30`)) : undefined,
    /^\d{4}-\d{2}-\d{2}$/.test(f.to ?? '') ? lte(auditLogs.createdAt, new Date(`${f.to}T23:59:59+05:30`)) : undefined,
    f.q ? or(ilike(auditLogs.entityId, `%${esc(f.q)}%`), ilike(auditLogs.ip, `%${esc(f.q)}%`), eq(auditLogs.entityType, f.q)) : undefined
  );
}

export function auditRows(f: AuditFilters, limit: number, offset = 0) {
  return db.select().from(auditLogs).where(auditWhere(f)).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
}

/** Compact device label from a user-agent string. */
export function deviceLabel(ua: string | null): string {
  if (!ua) return '—';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /node|undici|curl/i.test(ua) ? 'Script' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [browser, os].filter(Boolean).join(' · ');
}
