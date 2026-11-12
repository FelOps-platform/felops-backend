# Architecture

## Status and scope

This is the canonical living architecture design. The design below describes
proposed product components and flows; it does not mean they are implemented.
The API currently implements only `GET /api/v1/health`, which returns
`{"status":"ok"}` ([app source](../api/src/app.ts)). The current database schema
defines only the `users` table ([schema source](../api/src/database/schema.ts));
the health route does not use it.

The main Sprint 1 path is proposed and must use an action that does not require
approval. The Approval Service is out of scope for Sprint 1, so an action that
depends on approval cannot be part of that path. This document owns the proposed
workflows; the schema lives in [Database](database.md).

## Components (proposed for Sprint 1)

### Client Layer

- **Frontend (Web App)** — manage workspaces, agents, integrations, and history;
  approval management is proposed outside Sprint 1.
- **Channels** — where end users talk to agents: a chat widget, a chat page, or
  WhatsApp.

### API Layer

- **API Server** — receives requests and routes them to backend services. The
  planned product routes are not implemented yet.

### Core Services

- **Auth Service** — login and sessions.
- **Workspace Service** — ownership and settings in the current proposal.
  Membership and roles are later design work; the proposed database currently
  models one owner per workspace, not a membership or role system.
- **Agent Service** — agent configuration, including which actions each agent
  may use. It saves rules; it does not run them.
- **Integration Service** — connect and disconnect platforms and manage their
  credentials. Setup only; it does not run actions.
- **Channel Service** — channels and their assigned agents. The agent/channel
  relationship is still under schema review; see [Database](database.md).
- **Conversation Service** — conversation state and history.

### AI Service

- **Orchestrator** — understands a request, plans the task, and delegates to
  subagents. It asks the MCP module for tools; it does not call them directly.
- **Internal Subagents** — help with planning.
- **LLM Providers** — GPT, Gemini, Claude, and DeepSeek.

### MCP module (planned, embedded in the API service)

The MCP runtime is planned as a module inside the API service rather than a
standalone package; see [ADR-0002](adr/ADR-0002-embed-mcp-in-api-service.md). No
MCP code exists yet.

- **Tool Registry** — tells the AI which tools are available for an agent.
- **Permission Check** — confirms the agent is allowed to run a requested tool.
- **Risk Check** — approval handling is proposed, but the Approval Service and
  approval-dependent execution are excluded from Sprint 1.
- **Connectors** — talk to Odoo, Zendesk, CRM, email, and other platforms.
- **Verify** — checks the real result after an action runs.
- **Audit Log** — records who did what and who approved it; its schema and
  implementation remain future design work.

### Data Layer

- **PostgreSQL** — proposed storage for workspaces, agents, channels, permissions,
  and execution records. Only the `users` table is currently defined in code.
- **Credential Vault** — a proposed credential store. Its relationship to the
  MCP module and the per-request credential alternative remain undecided; see
  [Open decisions](#open-decisions).

**Left out for Sprint 1:** Mobile App, Billing Service, Approval Service,
WebSockets Server, Mobile Notifications Service, ChromaDB, Redis, and RabbitMQ.

## Proposed data flows

The core design is that the Backend saves agent rules and the MCP module enforces
them. These flows are proposals, not implemented API behavior or endpoint
contracts.

### Flow 1 — Channel message

This proposed Sprint 1 path excludes human takeover and approval-dependent
actions. Human assignment and the agent/channel relationship need follow-up
design; see [Database](database.md).

1. An end user sends a message through a channel (WhatsApp, chat widget, or chat
   page).
2. The channel delivers the request to the API Server, which authenticates it
   and resolves the workspace, channel, and conversation context.
   The channel, its agent, and the end user must resolve to the same workspace;
   the revised schema and authorization design must specify the enforcement.
3. The Conversation Service saves the message, and the API Server forwards the
   request to the AI Service.
4. The Orchestrator loads conversation history from PostgreSQL, plans the task
   with internal subagents, and selects a specialist agent.
5. The specialist asks the MCP module which tools are available for that agent.
   The module applies the saved action permissions.
6. The specialist asks the MCP module to run an eligible tool. Sprint 1 covers
   only actions that do not require an approval workflow.
7. The MCP module runs the action through a Connector.
8. The proposed Verify and Audit Log components record the result and return it
   to the AI Service.
9. The result returns through the API Server; the Conversation Service saves the
   reply and the originating channel delivers it.

### Flow 2 — Integration setup

1. An authorized user opens the integrations page.
2. The frontend requests the integration catalog and each integration's
   workspace status. The proposal includes an ID, name, image URL, status,
   authorization method (OAuth or API key), and type (for example, e-commerce or
   ERP).
3. The user selects an integration; the frontend shows its details and available
   actions.
4. The frontend sends the request to the API Server, which authenticates it and
   checks the user's permissions.
5. The API Server forwards the request to the Integration Service. The user
   authorizes the application:
   - **OAuth:** the frontend redirects to the provider. The provider returns the
     user to the callback URL with an authorization code. The backend validates
     the OAuth state, exchanges the code for an access token and, if provided, a
     refresh token, then stores the connection credentials securely and returns
     the user to the frontend with the authorization result.
   - **API key:** the frontend collects the key, and the backend validates it and
     stores it securely.
6. The Integration Service stores the workspace connection. The proposal also
   records the user who connected it, but the current proposed schema does not
   define that field; resolve it during the database revision.
7. The Integration Service makes the workspace connection available to the MCP
   module's Tool Registry.
8. The integration's actions appear in the dashboard, ready to be assigned to
   agents.

Credential storage and delivery remain open; see
[Open decisions](#open-decisions).

### Flow 3 — Agent configuration

1. An authorized user creates or edits an agent in the dashboard.
2. The API Server authenticates the request and checks permissions.
3. The user sets the agent's instructions, knowledge sources, enabled actions,
   and channels.
4. The Agent Service validates the configuration and saves it in PostgreSQL,
   including which actions are enabled and which require approval.
5. The Channel Service links the agent to its assigned channels. The exact
   relationship is pending schema review.
6. When a task runs, the MCP module enforces the saved rules; approval-dependent
   actions are not part of Sprint 1.

### Flow 4 — Disconnecting from an integration

1. The user opens the integrations page and views connected integrations.
2. The user selects an integration to disconnect.
3. The frontend sends a disconnect request containing the integration ID.
4. The backend removes or revokes the connection's credential material from the
   chosen secure store and removes the workspace connection record.

Credential revocation and lifecycle remain subject to the open credential
decision; see [Open decisions](#open-decisions).

### Flow 5 — Viewing workspace actions

1. The user opens the actions page.
2. The frontend requests available actions from the backend.
3. The backend returns actions for integrations connected to the workspace,
   grouped by integration. Each action includes its name and description.
4. The frontend displays the groups and lets the user filter by integration or
   search by name.

### Flow 6 — Viewing and configuring an agent's allowed actions

1. The user opens the actions page for an agent.
2. The frontend requests that agent's allowed actions.
3. The backend returns the connected integrations' actions, grouped by
   integration. Each action includes its name and description.
4. The frontend displays the groups and lets the user filter by integration or
   search by name.
5. The user selects actions to allow for the agent; the frontend sends the
   selection and the backend updates the agent's allowed actions.
6. The proposal also lets the user mark an allowed action as requiring approval.
   Approval-dependent execution is outside Sprint 1 because the Approval Service
   is excluded; the Sprint 1 path must use an action that does not require
   approval.

### Flow 7 — Viewing execution history

1. The user opens workspace or agent execution history.
2. The frontend requests executed actions for the selected scope.
3. The backend returns the proposed history fields:
   - Workspace view: action name, integration name, agent name, and timestamp.
   - Agent view: action name, integration name, initiator (user or automatic
     agent), and timestamp.
4. The frontend displays the results in a table.

### Flow 8 — Authentication

This preserves the proposed authentication flow; the current API does not
implement it. Its final endpoint contracts, failure behavior, and ownership
checks still need the database review and Apidog design. Workspace member/role
authorization is not specified by this flow.

1. The user chooses email/password or Google OAuth.
2. The API Server forwards the request to the Auth Service.
3. For email/password, the Auth Service verifies the password and email OTP. For
   Google, it redirects to Google and validates the response.
4. The Auth Service creates or retrieves the user record, issues a JWT, and
   returns it to the client.
5. For a new user, the Workspace Service creates a default workspace and sets
   the user as Owner.

## Component map

```text
Client (Web App, WhatsApp, chat widget/page)
                    │
                    ▼
API Server ── Auth · Workspace · Agent · Integration · Channel · Conversation
                    │
                    ▼
AI Service (Orchestrator · Internal Subagents · LLM Providers)
                    │
                    ▼
MCP module in the API service (Tool Registry · Permission Check · Connectors · Verify · Audit)
                    │
                    └──────────────► External platforms (Odoo, CRM, email, etc.)

Proposed data: PostgreSQL
Credential Vault: proposed; access path is undecided
```

The map shows the proposed message/action path. It does not decide the MCP
credential-delivery or rule-synchronization contracts.

## Open decisions

- **Product credentials:** Will the MCP module read workspace secrets directly
  from the Credential Vault, or receive them per request from the backend? API
  Infisical access currently retrieves application runtime configuration only; it
  does not settle product vault access.
- **Rules synchronization:** The Backend saves agent rules and the MCP module
  enforces them. Will the module keep its own copy of those rules or query the
  Backend for the current rules each time?

Schema questions such as session identity, agent/channel cardinality, workspace
isolation, message storage, and conversation history are owned by
[Database](database.md#open-design-questions). Endpoint contracts and mocks are
designed in Apidog; see [Delivery](delivery.md#current-handoff).
