/**
 * Read-only connectivity & schema check. Never writes, never prints the password.
 *   npm run db:check
 */
import { sql } from 'drizzle-orm';
import { getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { closeDb, getDb } from '../src/server/db';
import * as schema from '../src/server/db/schema';
import { describeDatabaseTarget } from './lib/remote-guard';

async function main() {
  const db = getDb();
  console.log(`Target: ${describeDatabaseTarget()}`);
  const rows = <T>(r: unknown) => ((r as { rows?: T[] }).rows ?? (r as T[]));
  const [{ version }] = rows<{ version: string }>(await db.execute(sql`select version()`));
  console.log(`✓ connected — ${version.split(',')[0]}`);

  const expected = Object.values(schema).filter((v) => is(v, PgTable)).map((t) => getTableName(t as PgTable)).sort();
  const present = rows<{ tablename: string; rowsecurity: boolean }>(
    await db.execute(sql`select tablename, rowsecurity from pg_tables where schemaname = 'public'`)
  );
  const have = new Set(present.map((t) => t.tablename));
  const missing = expected.filter((t) => !have.has(t));
  console.log(`${missing.length ? '✗' : '✓'} tables: ${expected.length - missing.length}/${expected.length} expected present${missing.length ? ` — missing: ${missing.join(', ')}` : ''}`);

  const noRls = present.filter((t) => expected.includes(t.tablename) && !t.rowsecurity).map((t) => t.tablename);
  console.log(`${noRls.length ? '✗' : '✓'} row-level security on all tables${noRls.length ? ` — missing on: ${noRls.join(', ')}` : ''}`);

  try {
    const applied = rows<{ n: number }>(await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`))[0]?.n;
    console.log(`✓ migrations applied: ${applied}`);
  } catch {
    console.log('• no migration history yet (run npm run db:migrate)');
  }
  await closeDb();
  if (missing.length || noRls.length) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error('✗ database check failed:', e instanceof Error ? e.message : e);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
