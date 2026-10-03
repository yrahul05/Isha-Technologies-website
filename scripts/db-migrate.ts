/**
 * Applies SQL migrations from ./drizzle, then syncs the RBAC catalogue
 * (roles, permissions, default grants — existing grant edits are kept).
 *
 *   npm run db:migrate
 *
 * Uses DATABASE_URL when set, otherwise the local PGlite database.
 * Stop `npm run dev` first when using PGlite (one process at a time).
 */
import { closeDb, getDb, PGLITE_DIR } from '../src/server/db';
import { syncRbac } from './lib/rbac';
import { describeDatabaseTarget } from './lib/remote-guard';

async function main() {
  console.log(`Target: ${describeDatabaseTarget()}`);
  const db = getDb();
  if (process.env.DATABASE_URL) {
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: './drizzle' });
    console.log('✓ migrations applied (PostgreSQL)');
  } else {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: './drizzle' });
    console.log(`✓ migrations applied (PGlite at ${PGLITE_DIR})`);
  }
  await syncRbac(db);
  console.log('✓ roles & permissions synced');
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
