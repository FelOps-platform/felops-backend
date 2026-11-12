# Database

## Status and ownership

This is the canonical living database design. The logical model below preserves
the current proposal and remains subject to the pending schema revision and
merge with Mahmoud's schema work. It is not a description of the implemented
database schema.

The only table currently defined in code is `users`, with an integer identity
`id`, required `name` and required unique `email`
([schema source](../api/src/database/schema.ts)). The implemented
[health endpoint](../api/src/app.ts) does not use the database. Product API and
data flows remain proposed; see [Architecture](architecture.md).

## Proposed relationship model

These relationships are design proposals. In particular, the Agent → Channel
cardinality remains unresolved pending the schema review.

### User → Workspace → Agent

- A user (the business owner) can have many workspaces.
- Each workspace belongs to one user for now.
- Each workspace can have many agents.

### Agent → Channel

The current proposal says an agent can have many channels, each channel belongs
to one agent, and the same channel cannot have multiple agents. This relation and
its cardinality are pending review and merge with Mahmoud's schema work; they
are not settled.

### Channel → Conversation

- A channel can have many conversations.
- Each conversation belongs to one channel.

### Workspace → End User

- A workspace can have many end users.
- Each end user belongs to one workspace.
- Scoping an end user to a workspace is intended to keep the same phone number
  or other identifier separate across businesses.

### End User → Conversation

- An end user can have many conversations.
- Each conversation belongs to one end user.

### Conversation → Message

- A conversation can have many messages.
- Each message belongs to one conversation.
- Message retention or archiving for future human takeover is not designed yet.

### Workspace isolation

Every conversation's channel and end user must resolve to the same workspace.
Under the proposed channel/agent relation, that also includes the channel's
agent. Independent foreign keys to Channel and End User do not establish this
invariant. The schema revision must define how to enforce it after the
agent/channel relationship is settled; no constraint or access check is
implemented by this document.

### Workspace → Integration

- `integrations` is proposed as a global catalog rather than workspace-owned
  data.
- A workspace connects to an integration through `workspace_integrations`.
- The proposal allows one connection per workspace and integration, using the
  composite key (`workspace_id`, `integration_id`).
- Each connection is private to its workspace; credentials are not shared across
  workspaces.
- Credential storage and delivery are unresolved; see
  [Architecture open decisions](architecture.md#open-decisions). The proposed
  `encrypted_credentials` field below does not decide whether the MCP module
  reads credentials from a Vault or receives them with each request.

### Integration → Action

- An integration has many actions.
- Each action belongs to one integration.

### Agent → Action

- An agent has a set of enabled actions.
- An action can be enabled for multiple agents through `agents_actions`.
- The proposal stores `require_approval` per agent/action pair.
- Approval handling is outside Sprint 1 because the Approval Service is excluded;
  Sprint 1 execution must not depend on approval.

### Other proposed entities

- The Agent → Knowledge Source relationship and Knowledge Source table are not
  designed yet.
- The Audit Log schema is not designed yet.

## Proposed logical data model

The fields below are retained from the product proposal, not confirmed database
DDL. The proposed User fields intentionally remain distinct from the smaller
implemented `users` table described above.

### User (business owner)

| Field | Type | Notes |
|---|---|---|
| `user_id` | Integer (PK) | Proposed identifier; implemented schema uses `id`. |
| `name` | String | |
| `email` | String | |
| `password_hash` | String (nullable) | Proposed null for Google OAuth users. |
| `is_verified` | Boolean | |
| `created_at` | Timestamp | |

The proposal has one user per workspace (the owner) for now and suggests multiple
workspace users later for human takeover. The implementation has not adopted
these fields or ownership rules.

Workspace membership and roles are not modeled here. Multi-user permissions
remain deferred design work; the current proposal's authorization checks need
to establish the workspace owner's identity and ownership without assuming a
membership or role table exists.

### Workspace

| Field | Type | Notes |
|---|---|---|
| `workspace_id` | Integer (PK) | |
| `owner_id` | Integer (FK → User) | |
| `name` | String | |
| `created_at` | Timestamp | |

### Agent

| Field | Type | Notes |
|---|---|---|
| `agent_id` | Integer (PK) | |
| `workspace_id` | Integer (FK → Workspace) | |
| `name` | String | |
| `role` | Text | |
| `constraints` | Text | |
| `response_format` | Text | |
| `created_at` | Timestamp | |

### Channel

| Field | Type | Notes |
|---|---|---|
| `channel_id` | Integer (PK) | |
| `agent_id` | Integer (FK → Agent) | Proposed relation; cardinality pending review. |
| `platform` | String | WhatsApp, chat widget, etc. |
| `created_at` | Timestamp | |

### End User

| Field | Type | Notes |
|---|---|---|
| `end_user_id` | Integer (PK) | |
| `workspace_id` | Integer (FK → Workspace) | |
| `identifier` | String | Proposed phone number, email, or session identifier. |
| `name` | String | |
| `created_at` | Timestamp | |

The proposal uses a unique composite key on (`workspace_id`, `identifier`) to
scope identifiers to businesses. The meaning of `session_id`, how it differs
from `identifier`, and whether/how it maps to an end user remain unresolved.

### Conversation

| Field | Type | Notes |
|---|---|---|
| `conversation_id` | Integer (PK) | |
| `channel_id` | Integer (FK → Channel) | |
| `end_user_id` | Integer (FK → End User) | |
| `status` | String | Proposed values: `ai`, `human_control`, `closed`. |
| `created_at` | Timestamp | |

Human takeover is later work. The proposal mentions a `human_id` pointing to the
User who owns a conversation in `human_control`, but assignment and the related
user/workspace model are not defined. Sprint 1 flows do not depend on this state.

### Message

| Field | Type | Notes |
|---|---|---|
| `message_id` | Integer (PK) | |
| `conversation_id` | Integer (FK → Conversation) | |
| `content` | Text | |
| `sender_type` | String | Proposed values: `ai`, `end_user`, `human`. |
| `created_at` | Timestamp | |

For later human takeover, the proposal mentions a `sender_id` pointing to User
when `sender_type` is `human`.

### Integration (global catalog)

| Field | Type | Notes |
|---|---|---|
| `integration_id` | Integer (PK) | |
| `name` | String | |
| `description` | Text | |
| `auth_method` | Enum (`integration_auth_method`) | |
| `is_active` | Boolean | |

### Workspace Integration (join table)

One proposed row represents one workspace's connection to one integration.

| Field | Type | Notes |
|---|---|---|
| `workspace_id` | Integer (FK → Workspace) | Composite PK. |
| `integration_id` | Integer (FK → Integration) | Composite PK. |
| `encrypted_credentials` | Text | Proposed field; credential storage and MCP module access contract remain open. |
| `status` | String | Suggested: `connected`, `disconnected`. |
| `connected_at` | Timestamp | Suggested. |
| `disconnected_at` | Timestamp | Suggested, nullable. |

The integration workflow also mentions recording which user connected it, but
this proposed table does not define that field. Reconcile it during the schema
revision rather than assuming it is stored.

### Action

| Field | Type | Notes |
|---|---|---|
| `action_id` | Integer (PK) | |
| `integration_id` | Integer (FK → Integration) | |
| `name` | String | |
| `description` | Text | |
| `input_schema` | JSONB | |

### Agent Action (join table)

One proposed row represents one action enabled for one agent.

| Field | Type | Notes |
|---|---|---|
| `agent_id` | Integer (FK → Agent) | Composite PK. |
| `action_id` | Integer (FK → Action) | Composite PK. |
| `require_approval` | Boolean | Proposed per agent/action pair; execution support is outside Sprint 1. |

## Open design questions

- What is `session_id`, and how does it relate to an end user's `identifier`?
- What is the Agent → Channel cardinality? Resolve it with the pending schema
  revision and merge with Mahmoud's schema work.
- How will the revised schema and authorization contract enforce that a
  conversation's channel, agent, and end user belong to the same workspace?
- Is message storage short-term or long-term memory?
- Should the full conversation history be sent to the AI Service?

Product credential delivery and rules synchronization are owned by
[Architecture open decisions](architecture.md#open-decisions).

API endpoints, request/response examples, and mocks are not specified here. See
[Delivery](delivery.md#current-handoff) for the Apidog design handoff.
