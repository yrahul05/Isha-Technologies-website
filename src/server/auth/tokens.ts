import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { authTokens, users } from '@/server/db/schema';
import { randomToken, sha256 } from '@/server/security/crypto';

const TTL: Record<'password_reset' | 'invite', number> = {
  password_reset: 30 * 60 * 1000, // 30 minutes
  invite: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/** Issues a single-use token; only its SHA-256 is stored. Older unused tokens of the same type are invalidated. */
export async function issueAuthToken(userId: string, type: 'password_reset' | 'invite'): Promise<string> {
  const token = randomToken(32);
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type), isNull(authTokens.usedAt)));
  await db.insert(authTokens).values({
    userId,
    type,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + TTL[type]),
  });
  return token;
}

/** Looks up a valid, unused token without consuming it (for rendering the form). */
export async function peekAuthToken(token: string) {
  if (!token || token.length > 100) return null;
  const [row] = await db
    .select({ token: authTokens, user: users })
    .from(authTokens)
    .innerJoin(users, eq(users.id, authTokens.userId))
    .where(and(eq(authTokens.tokenHash, sha256(token)), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

/** Atomically consumes the token; returns the user id or null if already used/expired. */
export async function consumeAuthToken(token: string): Promise<{ userId: string; type: 'password_reset' | 'invite' } | null> {
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.tokenHash, sha256(token)), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .returning({ userId: authTokens.userId, type: authTokens.type });
  return row ?? null;
}
