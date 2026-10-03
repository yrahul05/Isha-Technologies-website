/**
 * Tolerant reading of DATABASE_URL. Pasting a connection string into a hosting
 * dashboard often brings along things that make it an invalid URL:
 *   DATABASE_URL="postgresql://…"      (the `NAME=` prefix and/or surrounding quotes)
 *   trailing spaces / newlines
 * These are stripped. Anything still unparseable (for example a raw `#`, `/` or `?`
 * in the password, which must be percent-encoded) raises a clear error — the message
 * never contains the value.
 */
export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  let v = raw.trim();
  v = v.replace(/^DATABASE_URL\s*=\s*/i, '').trim();
  for (let i = 0; i < 2; i++) {
    if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

export function assertValidDatabaseUrl(url: string): URL {
  try {
    const parsed = new URL(url);
    if (!/^postgres(ql)?:$/.test(parsed.protocol)) throw new Error('protocol');
    return parsed;
  } catch {
    throw new Error(
      'DATABASE_URL is not a valid PostgreSQL connection string. Expected postgresql://USER:PASSWORD@HOST:PORT/DATABASE — ' +
        'no surrounding quotes, no "DATABASE_URL=" prefix, and any #, /, ? or @ inside the password must be percent-encoded.'
    );
  }
}

/**
 * Supabase's Shared Transaction Pooler (port 6543) stalls this app: with postgres.js and
 * `prepare: false`, concurrent queries on the pooled connection hang (reproduced: the dashboard
 * and every page that fires several queries at once never completes). The Session Pooler on the
 * SAME host (port 5432) handles the same load correctly. So a Supabase pooler URL on :6543 is
 * used as :5432. Returns the URL to connect with and whether it was changed.
 */
export function preferSessionPooler(url: string): { url: string; switched: boolean } {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('.pooler.supabase.com') && u.port === '6543') {
      u.port = '5432';
      return { url: u.toString(), switched: true };
    }
  } catch {
    /* validated elsewhere */
  }
  return { url, switched: false };
}
