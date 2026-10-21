# Database

> **TODO**
> - Clarify what `session_id` is and how it differs from the end-user identifier.
> - Merge with Mahmoud's schema work.

---

## Relationship Integrity

### User → Workspace → Agent

- A user (the business owner) can have many workspaces.
- Each workspace belongs to one user (for now).
- Each workspace can have many agents.

### Agent → Channel

- Each agent can have many channels.
- Each channel belongs to one agent.
- The same channel cannot have multiple agents (see requirement spec).
- An agent can exist across multiple channels.

> **TODO** — Mahmoud raised a design conflict here. Revisit.

### Channel → Conversation

- A channel can have many conversations.
- Each conversation belongs to one channel.

### Workspace → End User

- A workspace can have many end users.
- Each end user belongs to one workspace.
- This scopes the end user to a specific business. If the same phone number texts two different workspaces, the system creates two completely separate end-user profiles. This prevents conversation and data leaks between businesses.

### End User → Conversation

- An end user can have many conversations.
- Each conversation belongs to one end user.

### Conversation → Message

- A conversation can have many messages.
- Each message belongs to one conversation.

> **TODO (later)** — When we work on human takeover, optimize the messages table. Consider archiving or publishing old messages.

### Workspace → Integration

- A workspace can have many integrations (Odoo, Gmail, CRM).
- `integrations` is a global catalog — it is not owned by any workspace.
- A workspace connects to an integration through `workspace_integrations`, which stores that workspace's own `encrypted_credentials`.
- Each row in `workspace_integrations` is one workspace's private connection. Credentials are never shared between workspaces.
- A workspace can connect each integration only once (composite key: `workspace_id` + `integration_id`).
- This is many-to-many between the catalog and workspaces, but each connection row is privately owned by one workspace.

### Integration → Action

- An integration has many actions.
- Each action belongs to one integration.

### Agent → Action

- An agent has a set of enabled actions.
- The same action can be enabled for multiple agents (many-to-many through `agents_actions`).
- `require_approval` is stored per agent per action — so the same action can require approval for one agent but not another.

> **TODO** — Agent → Knowledge Source  
> **TODO** — Audit Log schema

---

## Logical Data Model

### User (Business Owner)

| Field | Type | Notes |
|---|---|---|
| `user_id` | Integer (PK) | |
| `name` | String | |
| `email` | String | |
| `password_hash` | String (nullable) | Null for Google OAuth users |
| `is_verified` | Boolean | |
| `created_at` | Timestamp | |

For now there is one user per workspace (the owner). When we work on human takeover, a workspace will have multiple users.

---

### Workspace

| Field | Type | Notes |
|---|---|---|
| `workspace_id` | Integer (PK) | |
| `owner_id` | Integer (FK → User) | |
| `name` | String | |
| `created_at` | Timestamp | |

---

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

---

### Channel

| Field | Type | Notes |
|---|---|---|
| `channel_id` | Integer (PK) | |
| `agent_id` | Integer (FK → Agent) | |
| `platform` | String | WhatsApp, chat widget, etc. |
| `created_at` | Timestamp | |

---

### End User

| Field | Type | Notes |
|---|---|---|
| `end_user_id` | Integer (PK) | |
| `workspace_id` | Integer (FK → Workspace) | |
| `identifier` | String | Phone number, email, or session ID |
| `name` | String | |
| `created_at` | Timestamp | |

**Constraint:** unique composite key on (`workspace_id`, `identifier`) — prevents data from the same identifier leaking across workspaces.

---

### Conversation

| Field | Type | Notes |
|---|---|---|
| `conversation_id` | Integer (PK) | |
| `channel_id` | Integer (FK → Channel) | |
| `end_user_id` | Integer (FK → End User) | |
| `status` | String | `ai`, `human_control`, `closed` |
| `created_at` | Timestamp | |

**Later (human takeover):** add a `human_id` column pointing to the User who owns the conversation when status is `human_control`.

---

### Message

| Field | Type | Notes |
|---|---|---|
| `message_id` | Integer (PK) | |
| `conversation_id` | Integer (FK → Conversation) | |
| `content` | Text | |
| `sender_type` | String | `ai`, `end_user`, `human` |
| `created_at` | Timestamp | |

**Later (human takeover):** add a `sender_id` column pointing to the User when `sender_type` is `human`.

---

### Integration (global catalog)

| Field | Type | Notes |
|---|---|---|
| `integration_id` | Integer (PK) | |
| `name` | String | |
| `description` | Text | |
| `auth_method` | Enum (`integration_auth_method`) | |
| `is_active` | Boolean | |

---

### Workspace Integration (join table)

One row = one workspace's private connection to one integration.

| Field | Type | Notes |
|---|---|---|
| `workspace_id` | Integer (FK → Workspace) | PK (composite) |
| `integration_id` | Integer (FK → Integration) | PK (composite) |
| `encrypted_credentials` | Text | |
| `status` | String | Suggested: `connected`, `disconnected` |
| `connected_at` | Timestamp | Suggested |
| `disconnected_at` | Timestamp | Suggested, nullable |

---

### Action

| Field | Type | Notes |
|---|---|---|
| `action_id` | Integer (PK) | |
| `integration_id` | Integer (FK → Integration) | |
| `name` | String | |
| `description` | Text | |
| `input_schema` | JSONB | |

---

### Agent Action (join table)

One row = one action enabled for one agent.

| Field | Type | Notes |
|---|---|---|
| `agent_id` | Integer (FK → Agent) | PK (composite) |
| `action_id` | Integer (FK → Action) | PK (composite) |
| `require_approval` | Boolean | Per agent per action |

---

> **TODO** — Knowledge Source table

---

## Open Questions

- **API step 4:** When the API Server saves the message via the Conversation Service, is this short-term or long-term memory? Gamal says short-term.
- **Conversation forwarding:** Do we send the full conversation history to the AI? Mahmoud says yes — revisit the original decision.
