import 'server-only';
import { and, count, eq, gt, lt } from 'drizzle-orm';
import { db } from '@/server/db';
import { loginAttempts } from '@/server/db/schema';

/**
 * Database-backed login throttling — works across every serverless
 * instance (unlike the in-memory limiter used by the public contact form).
 *   - 5 failures for one account in 15 min → that account is locked for the window
 *   - 25 failures from one IP in 15 min   → that IP is locked for the window
 * A successful login does not reset the counters (prevents interleaving
 * one valid account to keep brute-forcing another from the same IP).
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IDENTIFIER = 5;
const MAX_PER_IP = 25;

export async function isLoginThrottled(identifier: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [[byId], [byIp]] = await Promise.all([
    db
      .select({ n: count() })
      .from(loginAttempts)
      .where(
        and(eq(loginAttempts.identifier, identifier), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since))
      ),
    db
      .select({ n: count() })
      .from(loginAttempts)
      .where(and(eq(loginAttempts.ip, ip), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since))),
  ]);
  return (byId?.n ?? 0) >= MAX_PER_IDENTIFIER || (byIp?.n ?? 0) >= MAX_PER_IP;
}

export async function recordLoginAttempt(identifier: string, ip: string, success: boolean): Promise<void> {
  await db.insert(loginAttempts).values({ identifier, ip, success });
  // Opportunistic cleanup of rows older than a day.
  if (Math.random() < 0.02) {
    await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
  }
}

/** Generic sliding-window limiter on the same table (forgot-password, public forms). */
export async function consumeRateLimit(bucket: string, ip: string, max: number, windowMs: number): Promise<boolean> {
  const identifier = `rl:${bucket}`;
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.identifier, identifier), eq(loginAttempts.ip, ip), gt(loginAttempts.createdAt, since)));
  if ((row?.n ?? 0) >= max) return false;
  await db.insert(loginAttempts).values({ identifier, ip, success: false });
  return true;
}
