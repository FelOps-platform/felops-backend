import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import config from './src/config/env.js';

export default defineConfig({
  out: './drizzle',
  schema: './src/database',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.DATABASE_URL,
  },
});
