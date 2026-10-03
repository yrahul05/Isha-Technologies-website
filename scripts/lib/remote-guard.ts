/**
 * Guards for scripts that WRITE demo/test data. If DATABASE_URL points at a
 * real (non-local) server they refuse to run, so `npm test` or a demo seed can
 * never pollute the Supabase production database by accident.
 * Override only for a disposable database: ALLOW_TEST_ON_REMOTE_DB=1.
 */
export function describeDatabaseTarget(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'embedded PGlite (local)';
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}${u.pathname} as ${decodeURIComponent(u.username)}`; // never the password
  } catch {
    return 'DATABASE_URL (unparseable)';
  }
}

export function isRemoteDatabase(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return !['localhost', '127.0.0.1', '::1'].includes(host);
  } catch {
    return true;
  }
}

export function refuseOnRemoteDatabase(what: string): void {
  if (isRemoteDatabase() && process.env.ALLOW_TEST_ON_REMOTE_DB !== '1') {
    throw new Error(
      `Refusing to ${what} on a remote database (${describeDatabaseTarget()}).\n` +
        'Run it against the local PGlite database instead: unset DATABASE_URL (or set PGLITE_DIR) for this command.\n' +
        'Only for a disposable database: ALLOW_TEST_ON_REMOTE_DB=1.'
    );
  }
}
