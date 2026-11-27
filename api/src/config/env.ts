import 'dotenv/config';
import { z } from 'zod';
import { fetchSecrets } from '../infra/infisical/fetch-secrets.js';

export const ALLOWED_NODE_ENVS = ['development', 'production', 'test'] as const;
export const ALLOWED_LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'trace', 'silent'] as const;

const trustProxySchema = z
  .union([z.boolean(), z.number().int().min(0), z.string()])
  .optional()
  .default(false)
  .transform((val): boolean | number | string => {
    // Never pass blanket `true` to Express trust proxy, which allows X-Forwarded-For spoofing.
    if (val === true) {
      return 1;
    }
    if (typeof val === 'boolean' || typeof val === 'number') {
      return val;
    }
    const trimmed = val.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'false' || trimmed === '0') {
      return false;
    }
    if (trimmed === 'true') {
      return 1;
    }
    const asNumber = Number(trimmed);
    if (Number.isInteger(asNumber) && asNumber > 0) {
      return asNumber;
    }
    return val.trim();
  });

const corsOriginsSchema = z
  .union([z.array(z.string().min(1)), z.string()])
  .transform((val) => {
    const items = Array.isArray(val) ? val : val.split(',');
    return items.map((item) => item.trim()).filter(Boolean);
  })
  .refine((origins) => origins.length > 0 && !origins.includes('*'), {
    message: 'CORS_ORIGINS must contain at least one explicit origin and must not include "*"',
  });

export const envSchema = z
  .object({
    NODE_ENV: z.enum(ALLOWED_NODE_ENVS),
    LOG_LEVEL: z.enum(ALLOWED_LOG_LEVELS),
    PORT: z.coerce.number().int().min(1).max(65535),
    DATABASE_URL: z.url(),
    TRUST_PROXY: trustProxySchema,
    CORS_ORIGINS: corsOriginsSchema,
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_RESET_SECRET: z.string().min(32),
    AUTH_CODE_PEPPER: z.string().min(32),
    REFRESH_TOKEN_PEPPER: z.string().min(32),
    SMTP_HOST: z.string().trim().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535),
    SMTP_USER: z.string().trim().min(1),
    SMTP_PASS: z.string().min(1),
    EMAIL_FROM: z.email(),
  })
  .transform((parsed) => ({
    ...parsed,
    COOKIE_SECURE: parsed.NODE_ENV === 'production',
  }));

export type EnvConfig = z.infer<typeof envSchema>;

let currentConfig: EnvConfig | null = null;

// in tests, we want to initialize the config from a known object, not from the environment or secrets manager
export function initConfig(config: EnvConfig): EnvConfig {
  currentConfig = config;
  return currentConfig;
}

export function getConfig(): EnvConfig {
  if (!currentConfig) {
    throw new Error('Runtime config not initialized; call loadEnv() or initConfig() first.');
  }
  return currentConfig;
}

export async function loadEnv(): Promise<EnvConfig> {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv || !ALLOWED_NODE_ENVS.includes(nodeEnv as (typeof ALLOWED_NODE_ENVS)[number])) {
    throw new Error(
      `NODE_ENV must be one of: ${ALLOWED_NODE_ENVS.join(', ')} (received ${
        nodeEnv ? `"${nodeEnv}"` : 'no value'
      }).`,
    );
  }

  const secrets = await fetchSecrets();

  return initConfig(
    envSchema.parse({
      NODE_ENV: nodeEnv,
      ...secrets,
    }),
  );
}
