import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations } from '../database/relations.js';

function buildDrizzle(pool: Pool) {
  return drizzle({ client: pool, relations });
}

export type Database = ReturnType<typeof buildDrizzle>;
export type DbTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DbExecutor = Database | DbTransaction;

let currentDb: Database | null = null;
let currentPool: Pool | null = null;

export function initDatabase(connectionString: string): { db: Database; pool: Pool } {
  const pool = new Pool({ connectionString });
  const db = buildDrizzle(pool);
  currentPool = pool;
  currentDb = db;
  return { db, pool };
}

export function setDatabase(db: Database): void {
  currentDb = db;
}

export function getDb(): Database {
  if (!currentDb) {
    throw new Error('Database not initialized; call initDatabase() or setDatabase() first.');
  }
  return currentDb;
}

export async function closeDatabase(): Promise<void> {
  if (currentPool) {
    await currentPool.end();
    currentPool = null;
  }
  currentDb = null;
}
