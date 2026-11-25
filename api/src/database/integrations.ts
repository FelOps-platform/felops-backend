import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { integrationConnectionStatusEnum } from './enums.js';
import { workspaces } from './workspaces.js';

export const workspaceActionSettings = pgTable(
  'workspace_action_settings',
  {
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    toolKey: varchar('tool_key', { length: 100 }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    updatedBy: integer('updated_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.toolKey] })],
);

export const workspacesIntegrations = pgTable(
  'workspaces_integrations',
  {
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    integrationKey: varchar('integration_key', { length: 50 }).notNull(),
    externalAccountId: varchar('external_account_id', { length: 255 }).notNull(),
    externalAccountName: varchar('external_account_name', { length: 255 }),
    grantedScopes: varchar('granted_scopes', { length: 1000 }),
    encryptedCredentials: text('encrypted_credentials').notNull(),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    connectedBy: integer('connected_by')
      .notNull()
      .references(() => users.id),
    connectedAt: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
    lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
    status: integrationConnectionStatusEnum('status').notNull().default('connected'),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.integrationKey] }),
    index('idx_wi_integration').on(t.integrationKey),
  ],
);

export const oauthStates = pgTable(
  'oauth_states',
  {
    stateHash: varchar('state_hash', { length: 64 }).primaryKey(),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    integrationKey: varchar('integration_key', { length: 50 }).notNull(),
    initiatedBy: integer('initiated_by')
      .notNull()
      .references(() => users.id),
    redirectUri: varchar('redirect_uri', { length: 2048 }).notNull(),
    returnPath: varchar('return_path', { length: 512 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_oauth_state_workspace').on(t.workspaceId, t.integrationKey),
    index('idx_oauth_state_expiry').on(t.expiresAt),
  ],
);
