import {
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { agents } from './agents.js';
import { users } from './auth.js';
import { knowledgeSourceTypeEnum, knowledgeStatusEnum } from './enums.js';
import { workspaces } from './workspaces.js';

export const knowledgeSources = pgTable(
  'knowledge_sources',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    sourceType: knowledgeSourceTypeEnum('source_type').notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    url: varchar('url', { length: 2048 }),
    fileType: varchar('file_type', { length: 20 }).$type<'txt' | 'pdf' | 'docx'>(),
    storageKey: varchar('storage_key', { length: 255 }),
    storageContentType: varchar('storage_content_type', { length: 100 }),
    status: knowledgeStatusEnum('status').notNull().default('processing'),
    errorMessage: varchar('error_message', { length: 1000 }),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('uq_knowledge_workspace_hash').on(t.workspaceId, t.contentHash),
    index('idx_knowledge_workspace_status').on(t.workspaceId, t.status),
  ],
);

export const agentsKnowledgeSources = pgTable(
  'agents_knowledge_sources',
  {
    agentId: integer('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    sourceId: integer('source_id')
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.agentId, t.sourceId] }),
    index('idx_agents_knowledge_source').on(t.sourceId),
  ],
);
