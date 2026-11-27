# Database

The canonical table, column, enum, and relationship definitions live in [schema.dbml](schema.dbml). This page explains the table groups, relationships, and modeling rules needed to read the schema.

## Table groups

| Group | Tables | Notes |
| --- | --- | --- |
| Identity and authentication | `users`, `sessions`, `auth_codes` | Users own sessions and auth codes. Refresh tokens and codes are stored as hashes. |
| Workspace | `workspaces` | Workspaces have an owner. Membership and roles are not modeled in the current DBML. |
| Agents | `agents`, `agents_actions`, `agents_knowledge_sources` | Agents own action grants and source assignments. |
| Workspace configuration | `workspace_action_settings`, `workspaces_integrations`, `oauth_states`, `workspaces_channels` | Workspace-scoped settings, OAuth state, and channel instances. |
| Conversations and executions | `conversations`, `messages`, `executions`, `approvals` | Conversations own messages. Executions and approvals reference a conversation. |
| Knowledge | `knowledge_sources`, `agents_knowledge_sources` | Sources are workspace-wide and shared through agent assignments. |

## Relationships

| Parent | Child | Notes |
| --- | --- | --- |
| `users` | `sessions` | A user has many refresh sessions. |
| `users` | `auth_codes` | A user has verification and password-reset codes. |
| `users` | `workspaces` | A user owns workspaces. |
| `workspaces` | `agents` | Each agent belongs to one workspace. |
| `workspaces` | `workspace_action_settings` | Workspace-level action overrides. |
| `workspaces` | `workspaces_integrations` | One connection per integration key per workspace. |
| `workspaces` | `oauth_states` | One-time OAuth state records. |
| `workspaces` | `workspaces_channels` | Multiple channel instances per workspace. |
| `workspaces` | `knowledge_sources` | Workspace source library. |
| `workspaces` | `conversations` | Workspace scope for conversations. |
| `workspaces` | `executions` | Workspace scope for tool executions. |
| `workspaces` | `approvals` | Workspace scope for approvals. |
| `agents` | `agents_actions` | Granted tool keys and approval flags. |
| `agents` | `agents_knowledge_sources` | Sources selected by the agent. |
| `knowledge_sources` | `agents_knowledge_sources` | Agent assignments for each source. |
| `agents` | `conversations` | The agent serving the conversation. |
| `workspaces_channels` | `conversations` | The channel hosting the conversation. |
| `conversations` | `messages` | Message history. |
| `conversations` | `executions` | Tool executions produced by the conversation. |
| `conversations` | `approvals` | Approval requests produced by the conversation. |
| `agents` | `executions` | The agent that requested the execution. |
| `agents` | `approvals` | The agent that requested the approval. |

## Modeling notes

### IDs and stable keys

- Numeric `id` columns are database identities.
- `tool_key` and `integration_key` are stable values from code, not foreign keys to definition tables.
- `channel_id` is a normal database identity. `channel_type` is the code-defined enum value.
- Action, integration, and channel type definitions live in code. The database stores workspace state and grants.

### Authentication and sessions

- Passwords are hashed with Argon2id; plaintext passwords are never stored or logged.
- Refresh tokens and auth codes are stored as hashes, never plaintext.
- The refresh cookie carries a session identifier and secret; only the secret hash is stored, so a stale token still identifies its session.
- Sessions expire and can be revoked. Sign-out and refresh-token mismatch outside a brief concurrent-refresh grace window revoke one session; password reset revokes all user sessions.
- Auth codes are single-use, expiring, and attempt-limited.
- [`api/scripts/cleanup-auth-data.sql`](../../api/scripts/cleanup-auth-data.sql) removes expired/revoked sessions and expired/consumed auth codes; run it manually on Supabase or schedule it with pg_cron.
- Email is normalized to lowercase; the unique index enforces one account per email, and `users.is_verified` is `not null`.
- Workspace membership and roles are out of scope. `workspaces.owner_id` remains the only workspace-to-user relationship.

### Workspace scoping

- Every workspace-owned row carries `workspace_id`.
- `messages` are scoped through their `conversation_id`.
- The Backend validates that related agents, sources, channels, and conversations belong to the same workspace.

### Settings and assignments

- `workspace_action_settings` is sparse. A missing row means the action is enabled by default.
- `agents_actions` stores the agent's granted tool keys and resolved `requires_approval` flag. Policy configuration is outside the current API outline.
- `agents_knowledge_sources` stores agent-to-source assignments. Sources remain workspace-wide.

### Channels

- `workspaces_channels` uses a numeric `id` primary key and a `channel_type` enum.
- A workspace can have multiple instances of the same type.
- Channel names are unique per workspace.
- `agent_id` is optional and becomes null when the agent is deleted.

### Conversations, executions, and approvals

- A conversation belongs to a workspace, agent, and channel.
- Messages belong to a conversation.
- Executions and approvals reference the conversation and agent that produced them.
- Executions store `tool_key` and `integration_key` as code keys. They do not have foreign keys to definition tables.
- Every execution has a unique `(workspace_id, idempotency_key)`.
- Pending, approved, and rejected approvals share the `approvals` table. The queue is the pending rows.
- Executions are not linked to approvals by a database relationship.

### Knowledge

- `knowledge_sources` is workspace-scoped.
- `(workspace_id, content_hash)` is unique, so duplicate content is rejected.
- Source content is not stored in the database. File objects live in object storage.
- `agents_knowledge_sources` is the only agent-to-source relationship.
- Deleting a source requires vector purge before local deletion.

### OAuth connections

- `workspaces_integrations` uses `(workspace_id, integration_key)` as its primary key.
- `oauth_states` stores hashed one-time state records.
- There is no pending account-selection table.

### Cascade behavior

- User deletion cascades `sessions`, `auth_codes`, and owned `workspaces` (which in turn cascade workspace-owned rows), and sets `workspace_action_settings.updated_by`, `workspaces_integrations.connected_by`, `oauth_states.initiated_by`, `knowledge_sources.created_by`, and `approvals.decided_by` to null.
- Account deletion is not yet implemented.
- Workspace deletion cascades workspace-owned rows.
- Channel deletion cascades its conversations.
- Conversation deletion cascades messages, executions, and approvals.
- Agent deletion clears channel assignments and cascades agent-owned grants and assignments.
