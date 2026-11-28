import { describe, expect, it } from 'vitest';
import { getTableName, isTable } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getTableConfig, isPgEnum, type PgTable } from 'drizzle-orm/pg-core';
import * as schema from '@/database/schema.js';
import { relations } from '@/database/relations.js';

const schemaEntries: unknown[] = Object.values(schema);
const tables = schemaEntries.filter((entry): entry is PgTable => isTable(entry));
const enums = schemaEntries.filter((entry) => isPgEnum(entry));

const tableByName = new Map(tables.map((table) => [getTableName(table), table]));

describe('Database schema parity with docs/database/schema.dbml', () => {
  it('defines all 8 enums with exact names and values', () => {
    const actualEnums = Object.fromEntries(
      enums.map((pgEnumEntry) => [pgEnumEntry.enumName, pgEnumEntry.enumValues]),
    );

    expect(actualEnums).toEqual({
      message_sender_type: ['user', 'agent'],
      execution_status: ['running', 'succeeded', 'failed'],
      approval_status: ['pending', 'approved', 'rejected'],
      knowledge_source_type: ['file', 'url'],
      knowledge_status: ['processing', 'ready', 'failed'],
      integration_connection_status: ['connected', 'invalid'],
      channel_type: ['whatsapp', 'widget', 'hosted'],
      auth_code_purpose: ['email_verification', 'password_reset'],
    });
  });

  it('defines all 16 tables', () => {
    expect([...tableByName.keys()].sort()).toEqual(
      [
        'users',
        'sessions',
        'auth_codes',
        'workspaces',
        'agents',
        'agents_actions',
        'workspace_action_settings',
        'workspaces_channels',
        'workspaces_integrations',
        'oauth_states',
        'conversations',
        'messages',
        'executions',
        'approvals',
        'knowledge_sources',
        'agents_knowledge_sources',
      ].sort(),
    );
  });

  it('matches column definitions, nullability, defaults, and primary keys', () => {
    const expectColumns = (
      tableName: string,
      expected: Array<{
        name: string;
        sqlType: string;
        notNull: boolean;
        hasDefault?: boolean;
        primary?: boolean;
        unique?: boolean;
        identity?: 'always';
        hasOnUpdate?: boolean;
      }>,
    ) => {
      const table = tableByName.get(tableName);
      expect(table, `Missing table ${tableName}`).toBeDefined();
      const config = getTableConfig(table!);
      expect(config.columns.map((c) => c.name)).toEqual(expected.map((e) => e.name));

      for (const spec of expected) {
        const col = config.columns.find((c) => c.name === spec.name)!;
        expect(col.getSQLType(), `${tableName}.${spec.name} type`).toBe(spec.sqlType);
        expect(col.notNull, `${tableName}.${spec.name} notNull`).toBe(spec.notNull);
        if (spec.hasDefault !== undefined) {
          expect(col.hasDefault, `${tableName}.${spec.name} hasDefault`).toBe(spec.hasDefault);
        }
        if (spec.primary !== undefined) {
          expect(col.primary, `${tableName}.${spec.name} primary`).toBe(spec.primary);
        }
        if (spec.unique !== undefined) {
          expect(col.isUnique, `${tableName}.${spec.name} unique`).toBe(spec.unique);
        }
        if (spec.identity !== undefined) {
          expect(col.generatedIdentity?.type, `${tableName}.${spec.name} identity`).toBe(
            spec.identity,
          );
        }
        if (spec.hasOnUpdate) {
          expect(typeof col.onUpdateFn, `${tableName}.${spec.name} onUpdateFn`).toBe('function');
        }
      }
    };

    expectColumns('users', [
      { name: 'id', sqlType: 'integer', notNull: true, primary: true, identity: 'always' },
      { name: 'name', sqlType: 'varchar(50)', notNull: true },
      { name: 'email', sqlType: 'varchar(255)', notNull: true, unique: true },
      { name: 'password_hash', sqlType: 'varchar(255)', notNull: true },
      { name: 'is_verified', sqlType: 'boolean', notNull: true, hasDefault: true },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
      {
        name: 'updated_at',
        sqlType: 'timestamp with time zone',
        notNull: true,
        hasDefault: true,
        hasOnUpdate: true,
      },
    ]);

    expectColumns('sessions', [
      { name: 'id', sqlType: 'varchar(36)', notNull: true, primary: true },
      { name: 'user_id', sqlType: 'integer', notNull: true },
      { name: 'refresh_token_hash', sqlType: 'varchar(64)', notNull: true, unique: true },
      { name: 'expires_at', sqlType: 'timestamp with time zone', notNull: true },
      { name: 'last_used_at', sqlType: 'timestamp with time zone', notNull: false },
      { name: 'revoked_at', sqlType: 'timestamp with time zone', notNull: false },
      { name: 'user_agent', sqlType: 'varchar(512)', notNull: false },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
    ]);

    expectColumns('auth_codes', [
      { name: 'id', sqlType: 'integer', notNull: true, primary: true, identity: 'always' },
      { name: 'user_id', sqlType: 'integer', notNull: true },
      { name: 'purpose', sqlType: 'auth_code_purpose', notNull: true },
      { name: 'code_hash', sqlType: 'varchar(64)', notNull: true },
      { name: 'expires_at', sqlType: 'timestamp with time zone', notNull: true },
      { name: 'attempts', sqlType: 'integer', notNull: true, hasDefault: true },
      { name: 'consumed_at', sqlType: 'timestamp with time zone', notNull: false },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
    ]);

    expectColumns('workspaces', [
      { name: 'id', sqlType: 'integer', notNull: true, primary: true, identity: 'always' },
      { name: 'name', sqlType: 'varchar(50)', notNull: true },
      { name: 'owner_id', sqlType: 'integer', notNull: true },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
    ]);

    expectColumns('agents', [
      { name: 'id', sqlType: 'integer', notNull: true, primary: true, identity: 'always' },
      { name: 'workspace_id', sqlType: 'integer', notNull: true },
      { name: 'name', sqlType: 'varchar(50)', notNull: true },
      { name: 'instructions', sqlType: 'varchar(8000)', notNull: true },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
      {
        name: 'updated_at',
        sqlType: 'timestamp with time zone',
        notNull: true,
        hasDefault: true,
        hasOnUpdate: true,
      },
    ]);

    expectColumns('agents_actions', [
      { name: 'agent_id', sqlType: 'integer', notNull: true },
      { name: 'tool_key', sqlType: 'varchar(100)', notNull: true },
      { name: 'requires_approval', sqlType: 'boolean', notNull: true, hasDefault: true },
    ]);

    expectColumns('workspace_action_settings', [
      { name: 'workspace_id', sqlType: 'integer', notNull: true },
      { name: 'tool_key', sqlType: 'varchar(100)', notNull: true },
      { name: 'enabled', sqlType: 'boolean', notNull: true, hasDefault: true },
      { name: 'updated_by', sqlType: 'integer', notNull: false },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
      {
        name: 'updated_at',
        sqlType: 'timestamp with time zone',
        notNull: true,
        hasDefault: true,
        hasOnUpdate: true,
      },
    ]);

    expectColumns('workspaces_channels', [
      { name: 'id', sqlType: 'integer', notNull: true, primary: true, identity: 'always' },
      { name: 'workspace_id', sqlType: 'integer', notNull: true },
      { name: 'channel_type', sqlType: 'channel_type', notNull: true },
      { name: 'name', sqlType: 'varchar(100)', notNull: true },
      { name: 'agent_id', sqlType: 'integer', notNull: false },
      { name: 'config', sqlType: 'jsonb', notNull: true, hasDefault: true },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
      {
        name: 'updated_at',
        sqlType: 'timestamp with time zone',
        notNull: true,
        hasDefault: true,
        hasOnUpdate: true,
      },
    ]);

    expectColumns('workspaces_integrations', [
      { name: 'workspace_id', sqlType: 'integer', notNull: true },
      { name: 'integration_key', sqlType: 'varchar(50)', notNull: true },
      { name: 'external_account_id', sqlType: 'varchar(255)', notNull: true },
      { name: 'external_account_name', sqlType: 'varchar(255)', notNull: false },
      { name: 'granted_scopes', sqlType: 'varchar(1000)', notNull: false },
      { name: 'encrypted_credentials', sqlType: 'text', notNull: true },
      { name: 'token_expires_at', sqlType: 'timestamp with time zone', notNull: false },
      { name: 'connected_by', sqlType: 'integer', notNull: false },
      {
        name: 'connected_at',
        sqlType: 'timestamp with time zone',
        notNull: true,
        hasDefault: true,
      },
      { name: 'last_validated_at', sqlType: 'timestamp with time zone', notNull: false },
      { name: 'status', sqlType: 'integration_connection_status', notNull: true, hasDefault: true },
    ]);

    expectColumns('oauth_states', [
      { name: 'state_hash', sqlType: 'varchar(64)', notNull: true, primary: true },
      { name: 'workspace_id', sqlType: 'integer', notNull: true },
      { name: 'integration_key', sqlType: 'varchar(50)', notNull: true },
      { name: 'initiated_by', sqlType: 'integer', notNull: false },
      { name: 'redirect_uri', sqlType: 'varchar(2048)', notNull: true },
      { name: 'return_path', sqlType: 'varchar(512)', notNull: false },
      { name: 'expires_at', sqlType: 'timestamp with time zone', notNull: true },
      { name: 'consumed_at', sqlType: 'timestamp with time zone', notNull: false },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
    ]);

    expectColumns('conversations', [
      { name: 'id', sqlType: 'integer', notNull: true, primary: true, identity: 'always' },
      { name: 'workspace_id', sqlType: 'integer', notNull: true },
      { name: 'agent_id', sqlType: 'integer', notNull: true },
      { name: 'channel_id', sqlType: 'integer', notNull: true },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
    ]);

    expectColumns('messages', [
      { name: 'id', sqlType: 'integer', notNull: true, primary: true, identity: 'always' },
      { name: 'conversation_id', sqlType: 'integer', notNull: true },
      { name: 'sender_type', sqlType: 'message_sender_type', notNull: true },
      { name: 'content', sqlType: 'text', notNull: true },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
    ]);

    expectColumns('executions', [
      { name: 'id', sqlType: 'integer', notNull: true, primary: true, identity: 'always' },
      { name: 'workspace_id', sqlType: 'integer', notNull: true },
      { name: 'agent_id', sqlType: 'integer', notNull: true },
      { name: 'conversation_id', sqlType: 'integer', notNull: true },
      { name: 'integration_key', sqlType: 'varchar(50)', notNull: true },
      { name: 'tool_key', sqlType: 'varchar(100)', notNull: true },
      { name: 'tool_arguments', sqlType: 'jsonb', notNull: true, hasDefault: true },
      { name: 'idempotency_key', sqlType: 'varchar(255)', notNull: true },
      { name: 'status', sqlType: 'execution_status', notNull: true, hasDefault: true },
      { name: 'result', sqlType: 'jsonb', notNull: false },
      { name: 'error_code', sqlType: 'varchar(64)', notNull: false },
      { name: 'error_message', sqlType: 'varchar(1000)', notNull: false },
      { name: 'retryable', sqlType: 'boolean', notNull: false },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
      { name: 'finished_at', sqlType: 'timestamp with time zone', notNull: false },
    ]);

    expectColumns('approvals', [
      { name: 'id', sqlType: 'varchar(36)', notNull: true, primary: true },
      { name: 'workspace_id', sqlType: 'integer', notNull: true },
      { name: 'agent_id', sqlType: 'integer', notNull: true },
      { name: 'conversation_id', sqlType: 'integer', notNull: true },
      { name: 'job_id', sqlType: 'varchar(64)', notNull: true },
      { name: 'tool_key', sqlType: 'varchar(100)', notNull: true },
      { name: 'integration_key', sqlType: 'varchar(50)', notNull: true },
      { name: 'params', sqlType: 'jsonb', notNull: true, hasDefault: true },
      { name: 'effect_summary', sqlType: 'varchar(1000)', notNull: true },
      { name: 'status', sqlType: 'approval_status', notNull: true, hasDefault: true },
      { name: 'decided_by', sqlType: 'integer', notNull: false },
      { name: 'note', sqlType: 'varchar(1000)', notNull: false },
      {
        name: 'requested_at',
        sqlType: 'timestamp with time zone',
        notNull: true,
        hasDefault: true,
      },
      { name: 'decided_at', sqlType: 'timestamp with time zone', notNull: false },
    ]);

    expectColumns('knowledge_sources', [
      { name: 'id', sqlType: 'integer', notNull: true, primary: true, identity: 'always' },
      { name: 'workspace_id', sqlType: 'integer', notNull: true },
      { name: 'source_type', sqlType: 'knowledge_source_type', notNull: true },
      { name: 'content_hash', sqlType: 'varchar(64)', notNull: true },
      { name: 'name', sqlType: 'varchar(255)', notNull: true },
      { name: 'description', sqlType: 'varchar(1000)', notNull: false },
      { name: 'url', sqlType: 'varchar(2048)', notNull: false },
      { name: 'file_type', sqlType: 'varchar(20)', notNull: false },
      { name: 'storage_key', sqlType: 'varchar(255)', notNull: false },
      { name: 'storage_content_type', sqlType: 'varchar(100)', notNull: false },
      { name: 'status', sqlType: 'knowledge_status', notNull: true, hasDefault: true },
      { name: 'error_message', sqlType: 'varchar(1000)', notNull: false },
      { name: 'created_by', sqlType: 'integer', notNull: false },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
      {
        name: 'updated_at',
        sqlType: 'timestamp with time zone',
        notNull: true,
        hasDefault: true,
        hasOnUpdate: true,
      },
    ]);

    expectColumns('agents_knowledge_sources', [
      { name: 'agent_id', sqlType: 'integer', notNull: true },
      { name: 'source_id', sqlType: 'integer', notNull: true },
      { name: 'created_at', sqlType: 'timestamp with time zone', notNull: true, hasDefault: true },
    ]);
  });

  it('matches composite primary keys and indexes', () => {
    const compositePks: Record<string, string[]> = {
      agents_actions: ['agent_id', 'tool_key'],
      workspace_action_settings: ['workspace_id', 'tool_key'],
      workspaces_integrations: ['workspace_id', 'integration_key'],
      agents_knowledge_sources: ['agent_id', 'source_id'],
    };

    for (const [tableName, expectedCols] of Object.entries(compositePks)) {
      const config = getTableConfig(tableByName.get(tableName)!);
      expect(config.primaryKeys.map((pk) => pk.columns.map((c) => c.name))).toEqual([expectedCols]);
    }

    const actualIndexes = tables.flatMap((table) => {
      const config = getTableConfig(table);
      return config.indexes.map((idx) => ({
        table: config.name,
        name: idx.config.name,
        unique: idx.config.unique,
        columns: idx.config.columns.map((col) => ('name' in col ? col.name : String(col))),
      }));
    });

    expect(actualIndexes).toEqual([
      { table: 'sessions', name: 'idx_sessions_user', unique: false, columns: ['user_id'] },
      { table: 'sessions', name: 'idx_sessions_expiry', unique: false, columns: ['expires_at'] },
      {
        table: 'auth_codes',
        name: 'idx_auth_codes_user_purpose',
        unique: false,
        columns: ['user_id', 'purpose', 'created_at'],
      },
      {
        table: 'auth_codes',
        name: 'idx_auth_codes_expiry',
        unique: false,
        columns: ['expires_at'],
      },
      {
        table: 'workspaces',
        name: 'idx_workspaces_owner',
        unique: false,
        columns: ['owner_id'],
      },
      {
        table: 'agents',
        name: 'uq_agents_workspace_name',
        unique: true,
        columns: ['workspace_id', 'name'],
      },
      {
        table: 'workspaces_channels',
        name: 'uq_channels_workspace_name',
        unique: true,
        columns: ['workspace_id', 'name'],
      },
      {
        table: 'workspaces_integrations',
        name: 'idx_wi_integration',
        unique: false,
        columns: ['integration_key'],
      },
      {
        table: 'oauth_states',
        name: 'idx_oauth_state_workspace',
        unique: false,
        columns: ['workspace_id', 'integration_key'],
      },
      {
        table: 'oauth_states',
        name: 'idx_oauth_state_expiry',
        unique: false,
        columns: ['expires_at'],
      },
      {
        table: 'knowledge_sources',
        name: 'uq_knowledge_workspace_hash',
        unique: true,
        columns: ['workspace_id', 'content_hash'],
      },
      {
        table: 'knowledge_sources',
        name: 'idx_knowledge_workspace_status',
        unique: false,
        columns: ['workspace_id', 'status'],
      },
      {
        table: 'agents_knowledge_sources',
        name: 'idx_agents_knowledge_source',
        unique: false,
        columns: ['source_id'],
      },
      {
        table: 'conversations',
        name: 'idx_conversations_workspace_created',
        unique: false,
        columns: ['workspace_id', 'created_at'],
      },
      {
        table: 'messages',
        name: 'idx_messages_conversation_created',
        unique: false,
        columns: ['conversation_id', 'created_at'],
      },
      {
        table: 'executions',
        name: 'idx_executions_workspace_created',
        unique: false,
        columns: ['workspace_id', 'created_at'],
      },
      {
        table: 'executions',
        name: 'idx_executions_agent_created',
        unique: false,
        columns: ['agent_id', 'created_at'],
      },
      {
        table: 'executions',
        name: 'uq_executions_workspace_idempotency',
        unique: true,
        columns: ['workspace_id', 'idempotency_key'],
      },
      {
        table: 'approvals',
        name: 'idx_approvals_workspace_status',
        unique: false,
        columns: ['workspace_id', 'status'],
      },
      {
        table: 'approvals',
        name: 'idx_approvals_agent_status',
        unique: false,
        columns: ['agent_id', 'status'],
      },
    ]);
  });

  it('matches all 28 foreign keys and onDelete behaviors', () => {
    const actualFks = tables.flatMap((table) => {
      const config = getTableConfig(table);
      return config.foreignKeys.map((fk) => {
        const ref = fk.reference();
        return {
          table: config.name,
          columns: ref.columns.map((c) => c.name),
          foreignTable: getTableName(ref.foreignTable),
          foreignColumns: ref.foreignColumns.map((c) => c.name),
          onDelete: fk.onDelete ?? 'no action',
        };
      });
    });

    expect(actualFks).toHaveLength(28);
    expect(actualFks).toEqual(
      expect.arrayContaining([
        {
          table: 'sessions',
          columns: ['user_id'],
          foreignTable: 'users',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'auth_codes',
          columns: ['user_id'],
          foreignTable: 'users',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'workspaces',
          columns: ['owner_id'],
          foreignTable: 'users',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'agents',
          columns: ['workspace_id'],
          foreignTable: 'workspaces',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'agents_actions',
          columns: ['agent_id'],
          foreignTable: 'agents',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'workspaces_channels',
          columns: ['workspace_id'],
          foreignTable: 'workspaces',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'workspaces_channels',
          columns: ['agent_id'],
          foreignTable: 'agents',
          foreignColumns: ['id'],
          onDelete: 'set null',
        },
        {
          table: 'workspace_action_settings',
          columns: ['workspace_id'],
          foreignTable: 'workspaces',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'workspace_action_settings',
          columns: ['updated_by'],
          foreignTable: 'users',
          foreignColumns: ['id'],
          onDelete: 'set null',
        },
        {
          table: 'workspaces_integrations',
          columns: ['workspace_id'],
          foreignTable: 'workspaces',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'workspaces_integrations',
          columns: ['connected_by'],
          foreignTable: 'users',
          foreignColumns: ['id'],
          onDelete: 'set null',
        },
        {
          table: 'oauth_states',
          columns: ['workspace_id'],
          foreignTable: 'workspaces',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'oauth_states',
          columns: ['initiated_by'],
          foreignTable: 'users',
          foreignColumns: ['id'],
          onDelete: 'set null',
        },
        {
          table: 'knowledge_sources',
          columns: ['workspace_id'],
          foreignTable: 'workspaces',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'knowledge_sources',
          columns: ['created_by'],
          foreignTable: 'users',
          foreignColumns: ['id'],
          onDelete: 'set null',
        },
        {
          table: 'agents_knowledge_sources',
          columns: ['agent_id'],
          foreignTable: 'agents',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'agents_knowledge_sources',
          columns: ['source_id'],
          foreignTable: 'knowledge_sources',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'conversations',
          columns: ['workspace_id'],
          foreignTable: 'workspaces',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'conversations',
          columns: ['agent_id'],
          foreignTable: 'agents',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'conversations',
          columns: ['channel_id'],
          foreignTable: 'workspaces_channels',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'messages',
          columns: ['conversation_id'],
          foreignTable: 'conversations',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'executions',
          columns: ['workspace_id'],
          foreignTable: 'workspaces',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'executions',
          columns: ['agent_id'],
          foreignTable: 'agents',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'executions',
          columns: ['conversation_id'],
          foreignTable: 'conversations',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'approvals',
          columns: ['workspace_id'],
          foreignTable: 'workspaces',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'approvals',
          columns: ['agent_id'],
          foreignTable: 'agents',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'approvals',
          columns: ['conversation_id'],
          foreignTable: 'conversations',
          foreignColumns: ['id'],
          onDelete: 'cascade',
        },
        {
          table: 'approvals',
          columns: ['decided_by'],
          foreignTable: 'users',
          foreignColumns: ['id'],
          onDelete: 'set null',
        },
      ]),
    );
  });

  it('wires Drizzle Relations v2 across all 16 tables without collisions', () => {
    const db = drizzle.mock({ relations });
    expect(Object.keys(db.query).sort()).toEqual(
      [
        'users',
        'sessions',
        'authCodes',
        'workspaces',
        'agents',
        'agentsActions',
        'workspacesChannels',
        'workspaceActionSettings',
        'workspacesIntegrations',
        'oauthStates',
        'knowledgeSources',
        'agentsKnowledgeSources',
        'conversations',
        'messages',
        'executions',
        'approvals',
      ].sort(),
    );
  });
});
