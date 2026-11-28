import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { channelTypeEnum } from './enums.js';
import { workspaces } from './workspaces.js';

export const agents = pgTable(
  'agents',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    instructions: varchar('instructions', { length: 8000 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('uq_agents_workspace_name').on(t.workspaceId, t.name)],
);

export const agentsActions = pgTable(
  'agents_actions',
  {
    agentId: integer('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    toolKey: varchar('tool_key', { length: 100 }).notNull(),
    requiresApproval: boolean('requires_approval').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.agentId, t.toolKey] })],
);

export const workspacesChannels = pgTable(
  'workspaces_channels',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    channelType: channelTypeEnum('channel_type').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    agentId: integer('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('uq_channels_workspace_name').on(t.workspaceId, t.name)],
);
