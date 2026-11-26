import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { getDb } from '../../config/db.js';
import type { DbExecutor } from '../../config/db.js';
import { authCodes, sessions, users } from '../../database/auth.js';
import { AUTH_CODE_MAX_ATTEMPTS } from './auth.constants.js';
import type { AuthCodePurpose } from './auth.constants.js';

export type UserRecord = typeof users.$inferSelect;
export type SessionRecord = typeof sessions.$inferSelect;
export type AuthCodeRecord = typeof authCodes.$inferSelect;

export async function findUserByEmail(
  email: string,
  tx: DbExecutor = getDb(),
): Promise<UserRecord | null> {
  const [row] = await tx.select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

export async function findUserById(
  userId: number,
  tx: DbExecutor = getDb(),
): Promise<UserRecord | null> {
  const [row] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export async function createUser(
  input: { name: string; email: string; passwordHash: string },
  tx: DbExecutor = getDb(),
): Promise<UserRecord> {
  const [row] = await tx
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      isVerified: false,
    })
    .returning();
  return row;
}

export async function updateUnverifiedUser(
  input: { userId: number; name: string; passwordHash: string },
  tx: DbExecutor = getDb(),
): Promise<UserRecord | null> {
  const [row] = await tx
    .update(users)
    .set({ name: input.name, passwordHash: input.passwordHash })
    .where(and(eq(users.id, input.userId), eq(users.isVerified, false)))
    .returning();
  return row ?? null;
}

export async function markUserVerified(
  userId: number,
  tx: DbExecutor = getDb(),
): Promise<UserRecord> {
  const [row] = await tx
    .update(users)
    .set({ isVerified: true })
    .where(eq(users.id, userId))
    .returning();
  return row;
}

export async function updateUserPasswordAndVerify(
  input: { userId: number; passwordHash: string },
  tx: DbExecutor = getDb(),
): Promise<UserRecord> {
  const [row] = await tx
    .update(users)
    .set({ passwordHash: input.passwordHash, isVerified: true })
    .where(eq(users.id, input.userId))
    .returning();
  return row;
}

export async function invalidateActiveAuthCodes(
  input: { userId: number; purpose: AuthCodePurpose; now: Date },
  tx: DbExecutor = getDb(),
): Promise<void> {
  await tx
    .update(authCodes)
    .set({ consumedAt: input.now })
    .where(
      and(
        eq(authCodes.userId, input.userId),
        eq(authCodes.purpose, input.purpose),
        isNull(authCodes.consumedAt),
      ),
    );
}

export async function createAuthCode(
  input: { userId: number; purpose: AuthCodePurpose; codeHash: string; expiresAt: Date },
  tx: DbExecutor = getDb(),
): Promise<AuthCodeRecord> {
  const [row] = await tx
    .insert(authCodes)
    .values({
      userId: input.userId,
      purpose: input.purpose,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
    })
    .returning();
  return row;
}

export async function findLatestActiveAuthCode(
  input: { userId: number; purpose: AuthCodePurpose; isForUpdate?: boolean },
  tx: DbExecutor = getDb(),
): Promise<AuthCodeRecord | null> {
  const query = tx
    .select()
    .from(authCodes)
    .where(
      and(
        eq(authCodes.userId, input.userId),
        eq(authCodes.purpose, input.purpose),
        isNull(authCodes.consumedAt),
      ),
    )
    .orderBy(desc(authCodes.createdAt), desc(authCodes.id))
    .limit(1);

  const [row] = input.isForUpdate ? await query.for('update') : await query;
  return row ?? null;
}

export async function findAuthCodeById(
  authCodeId: number,
  tx: DbExecutor = getDb(),
): Promise<AuthCodeRecord | null> {
  const [row] = await tx.select().from(authCodes).where(eq(authCodes.id, authCodeId)).limit(1);
  return row ?? null;
}

export async function incrementAuthCodeAttempts(
  authCodeId: number,
  tx: DbExecutor = getDb(),
): Promise<void> {
  await tx
    .update(authCodes)
    .set({ attempts: sql`${authCodes.attempts} + 1` })
    .where(
      and(
        eq(authCodes.id, authCodeId),
        isNull(authCodes.consumedAt),
        lt(authCodes.attempts, AUTH_CODE_MAX_ATTEMPTS),
      ),
    );
}

export async function consumeAuthCode(
  input: { authCodeId: number; now: Date },
  tx: DbExecutor = getDb(),
): Promise<boolean> {
  const rows = await tx
    .update(authCodes)
    .set({ consumedAt: input.now })
    .where(and(eq(authCodes.id, input.authCodeId), isNull(authCodes.consumedAt)))
    .returning({ id: authCodes.id });
  return rows.length > 0;
}

export async function createSession(
  input: {
    id: string;
    userId: number;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
  },
  tx: DbExecutor = getDb(),
): Promise<SessionRecord> {
  const [row] = await tx
    .insert(sessions)
    .values({
      id: input.id,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
    })
    .returning();
  return row;
}

export async function findSessionById(
  sessionId: string,
  tx: DbExecutor = getDb(),
): Promise<SessionRecord | null> {
  const [row] = await tx.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  return row ?? null;
}

export async function rotateSessionToken(
  input: {
    sessionId: string;
    expectedRefreshTokenHash: string;
    newRefreshTokenHash: string;
    lastUsedAt: Date;
  },
  tx: DbExecutor = getDb(),
): Promise<boolean> {
  const rows = await tx
    .update(sessions)
    .set({ refreshTokenHash: input.newRefreshTokenHash, lastUsedAt: input.lastUsedAt })
    .where(
      and(
        eq(sessions.id, input.sessionId),
        eq(sessions.refreshTokenHash, input.expectedRefreshTokenHash),
        isNull(sessions.revokedAt),
      ),
    )
    .returning({ id: sessions.id });
  return rows.length > 0;
}

export async function revokeSession(
  input: { sessionId: string; revokedAt: Date },
  tx: DbExecutor = getDb(),
): Promise<void> {
  await tx
    .update(sessions)
    .set({ revokedAt: input.revokedAt })
    .where(and(eq(sessions.id, input.sessionId), isNull(sessions.revokedAt)));
}

export async function revokeAllUserSessions(
  input: { userId: number; revokedAt: Date },
  tx: DbExecutor = getDb(),
): Promise<void> {
  await tx
    .update(sessions)
    .set({ revokedAt: input.revokedAt })
    .where(and(eq(sessions.userId, input.userId), isNull(sessions.revokedAt)));
}
