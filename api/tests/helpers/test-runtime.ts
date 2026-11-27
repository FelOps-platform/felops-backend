import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { vi } from 'vitest';
import { setDatabase } from '@/config/db.js';
import type { Database } from '@/config/db.js';
import { envSchema, initConfig } from '@/config/env.js';
import { initLogger } from '@/config/logger.js';
import { relations } from '@/database/relations.js';
import { sendPasswordResetCode, sendVerificationCode } from '@/infra/email/email-sender.js';
import type { AuthCodeEmailInput } from '@/infra/email/email-sender.js';
import { clearAuthStores } from '@/modules/auth/auth.stores.js';

const DRIZZLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

export interface SentEmail {
  type: 'verification' | 'password_reset';
  to: string;
  code: string;
  expiresInMinutes: number;
}

export interface RecordedEmailSender {
  sent: SentEmail[];
  sendVerificationCode: (input: AuthCodeEmailInput) => Promise<void>;
  sendPasswordResetCode: (input: AuthCodeEmailInput) => Promise<void>;
  clear: () => void;
  latestCodeFor: (input: { email: string; type: 'verification' | 'password_reset' }) => string;
}

export interface TestRuntime {
  emailSender: RecordedEmailSender;
  pglite: PGlite;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

function createEmailRecorder(): RecordedEmailSender {
  const sent: SentEmail[] = [];
  return {
    sent,
    async sendVerificationCode({ to, code, expiresInMinutes }: AuthCodeEmailInput): Promise<void> {
      sent.push({ type: 'verification', to, code, expiresInMinutes });
    },
    async sendPasswordResetCode({ to, code, expiresInMinutes }: AuthCodeEmailInput): Promise<void> {
      sent.push({ type: 'password_reset', to, code, expiresInMinutes });
    },
    clear(): void {
      sent.length = 0;
    },
    latestCodeFor(input: { email: string; type: 'verification' | 'password_reset' }): string {
      const match = [...sent]
        .reverse()
        .find((item) => item.to === input.email && item.type === input.type && item.code);
      if (!match?.code) {
        throw new Error(`No ${input.type} code sent to ${input.email}`);
      }
      return match.code;
    },
  };
}

export function initTestConfig(): void {
  const config = envSchema.parse({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    PORT: 3000,
    DATABASE_URL: 'postgres://localhost:5432/felops_test',
    TRUST_PROXY: false,
    CORS_ORIGINS: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-chars-long',
    JWT_RESET_SECRET: 'test-reset-secret-minimum-32-chars-long!',
    AUTH_CODE_PEPPER: 'test-code-pepper-minimum-32-chars-long!!',
    REFRESH_TOKEN_PEPPER: 'test-refresh-pepper-min-32-chars-long!!!',
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 465,
    SMTP_USER: 'noreply@felops.test',
    SMTP_PASS: 'test-app-password',
    EMAIL_FROM: 'noreply@felops.test',
  });
  initConfig(config);
  initLogger(config);
}

export async function createTestRuntime(): Promise<TestRuntime> {
  initTestConfig();
  clearAuthStores();

  const emailSender = createEmailRecorder();
  if (vi.isMockFunction(sendVerificationCode)) {
    vi.mocked(sendVerificationCode).mockImplementation((input) =>
      emailSender.sendVerificationCode(input),
    );
  }
  if (vi.isMockFunction(sendPasswordResetCode)) {
    vi.mocked(sendPasswordResetCode).mockImplementation((input) =>
      emailSender.sendPasswordResetCode(input),
    );
  }

  const pglite = new PGlite();
  const migrationFolders = readdirSync(DRIZZLE_DIR).sort();
  for (const folder of migrationFolders) {
    const sqlPath = resolve(DRIZZLE_DIR, folder, 'migration.sql');
    await pglite.exec(readFileSync(sqlPath, 'utf8'));
  }

  const db = drizzle({ client: pglite, relations });
  setDatabase(db as unknown as Database);

  return {
    emailSender,
    pglite,
    reset: async () => {
      clearAuthStores();
      emailSender.clear();
      await pglite.exec('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    },
    close: async () => {
      await pglite.close();
    },
  };
}
