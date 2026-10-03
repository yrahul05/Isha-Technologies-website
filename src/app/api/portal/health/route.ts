import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/portal/health — deployment self-check, safe to expose.
 *
 * Reports ONLY coarse facts: which required settings are present, whether the
 * database answers, which kind of pooler the URL points at (by port), whether the
 * expected schema is there, and — on failure — a short error CATEGORY. It never
 * returns a value, hostname, username, password, key or message text.
 */
function classify(error: unknown): string {
  const e = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = e?.code ?? e?.cause?.code ?? '';
  const message = `${e?.message ?? ''} ${e?.cause?.message ?? ''}`.toLowerCase();
  if (code === '28P01' || code === '28000' || message.includes('password authentication failed')) return 'auth_failed';
  if (message.includes('tenant or user not found')) return 'tenant_or_user_not_found';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns_not_found';
  if (code === 'ECONNREFUSED') return 'connection_refused';
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH') return 'network_unreachable';
  if (code === 'CONNECT_TIMEOUT' || code === 'ETIMEDOUT' || message.includes('timeout')) return 'timeout';
  if (message.includes('ssl') || message.includes('tls') || code.startsWith('ERR_SSL')) return 'tls';
  if (code === '3D000') return 'database_does_not_exist';
  if (code === 'ERR_INVALID_URL' || message.includes('invalid url')) return 'invalid_database_url';
  return code ? `other:${code}` : 'other';
}

function poolerMode(url: string | undefined): string {
  if (!url) return 'none';
  try {
    const port = new URL(url).port || '5432';
    const host = new URL(url).hostname;
    if (host.includes('pooler.supabase.com')) return port === '6543' ? 'transaction-pooler(6543)' : port === '5432' ? 'session-pooler(5432)' : `pooler(port ${port})`;
    if (host.startsWith('db.') && host.endsWith('.supabase.co')) return 'direct-connection(IPv6-only; not reachable from Vercel)';
    return `other(port ${port})`;
  } catch {
    return 'unparseable';
  }
}

function encryptionKeyStatus(): string {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return 'missing';
  return Buffer.from(raw, 'base64').length === 32 ? 'ok' : 'wrong_length';
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'CONNECT_TIMEOUT' })), ms))]);
}

export async function GET() {
  const url = process.env.DATABASE_URL;
  const result: Record<string, unknown> = {
    env: {
      DATABASE_URL: url ? 'set' : 'missing',
      ENCRYPTION_KEY: encryptionKeyStatus(),
      CRON_SECRET: process.env.CRON_SECRET ? 'set' : 'missing',
      APP_URL: process.env.APP_URL ? 'set' : 'unset (production falls back to the portal origin)',
    },
    pooler: poolerMode(url),
  };

  let ok = Boolean(url);
  try {
    await withTimeout(db.execute(sql`select 1`), 8000);
    result.database = 'ok';
    try {
      const cols = (await withTimeout(
        db.execute(sql`select column_name from information_schema.columns where table_name = 'users' and column_name in ('force_password_change', 'password_hash', 'username')`),
        8000
      )) as unknown as { column_name: string }[];
      const names = new Set(cols.map((c) => c.column_name));
      result.schema = { users_columns: ['force_password_change', 'password_hash', 'username'].every((c) => names.has(c)) ? 'ok' : 'missing_columns' };
      if (result.schema && (result.schema as { users_columns: string }).users_columns !== 'ok') ok = false;
    } catch (error) {
      result.schema = { error: classify(error) };
      ok = false;
    }
  } catch (error) {
    result.database = { error: classify(error) };
    ok = false;
  }

  result.ok = ok;
  return NextResponse.json(result, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
