import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const hasInfisicalBootstrap =
  Boolean(process.env.INFISICAL_CLIENT_ID) &&
  Boolean(process.env.INFISICAL_CLIENT_SECRET) &&
  Boolean(process.env.INFISICAL_PROJECT_ID);

const databaseUrl = hasInfisicalBootstrap
  ? (await (await import('./src/config/env.js')).loadEnv()).DATABASE_URL
  : (process.env.DATABASE_URL ?? '');

export default defineConfig({
  out: './drizzle',
  schema: './src/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
