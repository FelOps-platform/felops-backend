import { index, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const workspaces = pgTable(
  'workspaces',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 50 }).notNull(),
    ownerId: integer('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_workspaces_owner').on(t.ownerId)],
);
