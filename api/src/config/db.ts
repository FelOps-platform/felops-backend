import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import env from './env.js';
import { relations } from '../database/relations.js';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

const db = drizzle({ client: pool, relations });

export type Database = typeof db;
export default db;
