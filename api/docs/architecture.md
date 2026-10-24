# Architecture

## Status and scope

This is the canonical living architecture design. The design below describes
proposed product components and flows; it does not mean they are implemented.
The API currently implements only `GET /api/v1/health`, which returns
`{"status":"ok"}` ([app source](../src/app.ts)). The current database schema
defines only the `users` table ([schema source](../src/database/schema.ts)); the
health route does not use it.

The main Sprint 1 path is proposed and must use an action that does not require
approval. The Approval Service is out of scope for Sprint 1, so an action that
depends on approval cannot be part of that path. API endpoint and request/response
contracts are to be designed in Apidog after the database revision and workspace
invitation; backend endpoint implementation follows that design.

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
  subagents. It asks the MCP Server for tools; it does not call them directly.
- **Internal Subagents** — help with planning.
- **LLM Providers** — GPT, Gemini, Claude, and DeepSeek.

### FelOps MCP Server

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
  MCP Server and the per-request credential alternative remain undecided below.

**Left out for Sprint 1:** Mobile App, Billing Service, Approval Service,
WebSockets Server, Mobile Notifications Service, ChromaDB, Redis, and RabbitMQ.

## Proposed data flows

The core design is that the Backend saves agent rules and the MCP Server enforces
them. How the MCP Server obtains the current rules remains undecided. These flows
are proposals, not implemented API behavior or endpoint contracts.

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
5. The specialist asks the MCP Server which tools are available for that agent.
   The MCP Server applies the saved action permissions; whether it reads current
   rules from the Backend or uses a synchronized copy is unresolved.
6. The specialist asks the MCP Server to run an eligible tool. Sprint 1 covers
   only actions that do not require an approval workflow.
7. The MCP Server runs the action through a Connector. Whether it reads
   credentials from the Vault or receives them with each request is unresolved.
8. The proposed Verify and Audit Log components record the result and return it
   to the AI Service.
9. The result returns through the API Server; the Conversation Service saves the
   reply and the originating channel delivers it.

### Flow 2 — Integration setup

1. An authorized user selects an integration in the dashboard (for example,
   Odoo, CRM, or email).
2. The frontend sends the request to the API Server, which authenticates it and
   checks the user's permissions.
3. The API Server forwards the request to the Integration Service.
4. The user completes authorization through OAuth or manual credentials, and the
   Integration Service tests the connection.
5. The Integration Service stores connection credentials securely. The storage
   location and how credentials reach the MCP Server remain undecided.
6. The Integration Service makes the workspace connection available to the MCP
   Server's Tool Registry.
7. The integration's actions appear in the dashboard, ready to be assigned to
   agents.

### Flow 3 — Agent configuration

1. An authorized user creates or edits an agent in the dashboard.
2. The API Server authenticates the request and checks permissions.
3. The user sets the agent's instructions, knowledge sources, enabled actions,
   and channels.
4. The Agent Service validates the configuration and saves it in PostgreSQL,
   including which actions are enabled and which require approval.
5. The Channel Service links the agent to its assigned channels. The exact
   relationship is pending schema review.
6. When a task runs, the MCP Server enforces the saved rules. The rule retrieval
   or synchronization contract remains open; approval-dependent actions are not
   part of Sprint 1.

### Flow 4 — Authentication

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
FelOps MCP Server (Tool Registry · Permission Check · Connectors · Verify · Audit)
                    │
                    └──────────────► External platforms (Odoo, CRM, email, etc.)

Proposed data: PostgreSQL
Credential Vault: proposed; access path is undecided
```

The map shows the proposed message/action path. It does not decide the MCP
credential-delivery or rule-synchronization contracts; see [Database](database.md)
for the schema questions and [Workflow](workflow.md) for the design handoff.
