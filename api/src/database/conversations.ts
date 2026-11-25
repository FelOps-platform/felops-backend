import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { agents, workspacesChannels } from './agents.js';
import { users } from './auth.js';
import { approvalStatusEnum, executionStatusEnum, messageSenderTypeEnum } from './enums.js';
import { workspaces } from './workspaces.js';

export const conversations = pgTable(
  'conversations',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    agentId: integer('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    channelId: integer('channel_id')
      .notNull()
      .references(() => workspacesChannels.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_conversations_workspace_created').on(t.workspaceId, t.createdAt)],
);

export const messages = pgTable(
  'messages',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderType: messageSenderTypeEnum('sender_type').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_messages_conversation_created').on(t.conversationId, t.createdAt)],
);

export const executions = pgTable(
  'executions',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    agentId: integer('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    integrationKey: varchar('integration_key', { length: 50 }).notNull(),
    toolKey: varchar('tool_key', { length: 100 }).notNull(),
    toolArguments: jsonb('tool_arguments').$type<Record<string, unknown>>().notNull().default({}),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    status: executionStatusEnum('status').notNull().default('running'),
    result: jsonb('result').$type<Record<string, unknown>>(),
    errorCode: varchar('error_code', { length: 64 }),
    errorMessage: varchar('error_message', { length: 1000 }),
    retryable: boolean('retryable'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_executions_workspace_created').on(t.workspaceId, t.createdAt),
    index('idx_executions_agent_created').on(t.agentId, t.createdAt),
    uniqueIndex('uq_executions_workspace_idempotency').on(t.workspaceId, t.idempotencyKey),
  ],
);

export const approvals = pgTable(
  'approvals',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    agentId: integer('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    jobId: varchar('job_id', { length: 64 }).notNull(),
    toolKey: varchar('tool_key', { length: 100 }).notNull(),
    integrationKey: varchar('integration_key', { length: 50 }).notNull(),
    params: jsonb('params').$type<Record<string, unknown>>().notNull().default({}),
    effectSummary: varchar('effect_summary', { length: 1000 }).notNull(),
    status: approvalStatusEnum('status').notNull().default('pending'),
    decidedBy: integer('decided_by').references(() => users.id),
    note: varchar('note', { length: 1000 }),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_approvals_workspace_status').on(t.workspaceId, t.status),
    index('idx_approvals_agent_status').on(t.agentId, t.status),
  ],
);
