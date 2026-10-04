import { z } from 'zod';
import 'dotenv/config';
import fetchSecrets from '../integrations/infisical/fetch-secrets.js';

const allowedNodeEnvs = ['development', 'production', 'test'] as const;
const allowedLogLevels = ['debug', 'info', 'warn', 'error', 'trace'] as const;

if (
  !process.env.NODE_ENV ||
  !allowedNodeEnvs.includes(process.env.NODE_ENV as (typeof allowedNodeEnvs)[number])
) {
  process.env.NODE_ENV = 'development';
}
const secrets = await fetchSecrets();

const envSchema = z.object({
  NODE_ENV: z.enum(allowedNodeEnvs),
  LOG_LEVEL: z.enum(allowedLogLevels),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.url(),
});

const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  ...secrets,
});

export default env;
