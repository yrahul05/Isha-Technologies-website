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
