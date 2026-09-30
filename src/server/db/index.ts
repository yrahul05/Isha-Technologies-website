/**
 * Database client.
 *
 * - `DATABASE_URL` set → a regular PostgreSQL connection (Neon, Supabase,
 *   RDS, Vercel Postgres… anything speaking the Postgres wire protocol).
 * - No `DATABASE_URL` in development → an embedded PGlite database (real
 *   Postgres compiled to WASM) persisted under `.data/pglite`, so the portal
 *   runs locally with zero installs. Production refuses to fall back.
 *
 * The client is created lazily on first use, so importing this module at
 * build time (static generation of public pages) never opens a connection.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { db?: Database; close?: () => Promise<void> };
const globalForDb = globalThis as unknown as { __ishaDb?: Holder };
const holder: Holder = (globalForDb.__ishaDb ??= {});

export const PGLITE_DIR = process.env.PGLITE_DIR || '.data/pglite';

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL) || process.env.NODE_ENV !== 'production';
}

function createDb(): Database {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, {
      // Serverless: keep the per-instance pool small; poolers (Neon, Supavisor)
      // handle fan-in. `prepare: false` keeps transaction-mode poolers happy.
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      prepare: false,
      idle_timeout: 20,
    });
    holder.close = () => client.end();
    return drizzlePostgres(client, { schema }) as unknown as Database;
  }

  // ALLOW_PGLITE_IN_PRODUCTION exists only to smoke-test `next start` locally.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PGLITE_IN_PRODUCTION !== '1') {
    throw new Error('DATABASE_URL is required in production.');
  }

  // Loaded through a runtime require rooted at the project, which bundlers
  // can't follow — keeps PGlite's ~25 MB of WASM out of production functions.
  const devRequire = createRequire(path.join(process.cwd(), 'package.json'));
  const { PGlite } = devRequire('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
  const { drizzle } = devRequire('drizzle-orm/pglite') as typeof import('drizzle-orm/pglite');
  mkdirSync(PGLITE_DIR, { recursive: true });
  const client = new PGlite(PGLITE_DIR);
  holder.close = () => client.close();
  return drizzle(client, { schema }) as unknown as Database;
}

export function getDb(): Database {
  return (holder.db ??= createDb());
}

export async function closeDb(): Promise<void> {
  await holder.close?.();
  holder.db = undefined;
  holder.close = undefined;
}

/** Lazy proxy so modules can `import { db }` without connecting at import time. */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export { schema };
