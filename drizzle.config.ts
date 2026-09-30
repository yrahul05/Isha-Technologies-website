import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` diffs src/server/db/schema.ts against the committed
// migrations in ./drizzle and writes a new SQL migration. Migrations are
// applied by scripts/db-migrate.ts (works for both Postgres and PGlite).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  strict: true,
});
