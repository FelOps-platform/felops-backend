# Architecture

## Components (Sprint 1)

### Client Layer

- **Frontend (Web App)** — manage workspaces, agents, integrations, approvals, and history.
- **Channels** — where end users talk to agents: a chat widget, a chat page, or WhatsApp.

### API Layer

- **API Server** — receives all requests and routes them to the right service.

### Core Services

- **Auth Service** — login and sessions.
- **Workspace Service** — members, roles, and settings.
- **Agent Service** — agent config, including which actions each agent may use. Saves the rules only; does not run them.
- **Integration Service** — connect and disconnect platforms, save credentials. Setup only; does not run actions.
- **Channel Service** — channels and their assigned agents.
- **Conversation Service** — conversation state and history.

### AI Service

- **Orchestrator** — understands the request, plans the task, and delegates to subagents. Asks the MCP Server for tools; does not call them directly.
- **Internal Subagents** — help with planning.
- **LLM Providers** — GPT, Gemini, Claude, DeepSeek.

### FelOps MCP Server

- **Tool Registry** — tells the AI which tools are available for a given agent.
- **Permission Check** — confirms the agent is allowed to run the requested tool.
- **Risk Check** — decides if approval is needed; if yes, pauses and notifies the Approval Service.
- **Connectors** — talk to Odoo, Zendesk, CRM, and others.
- **Verify** — checks the real result after the action runs.
- **Audit Log** — records who did what and who approved it.

### Data Layer

- **PostgreSQL** — users, workspaces, agents, channels, permissions, execution records.
- **Credential Vault** — stores external platform secrets safely.

> **Open questions**
> 1. Credentials: does the MCP Server read them from the Vault directly, or does the backend send them with each request?
> 2. Rules: does the MCP Server keep its own copy, or does it ask the backend every time?

**Left out for Sprint 1:** Mobile App, Billing Service, Approval Service, WebSockets Server, Mobile Notifications Service, ChromaDB, Redis, RabbitMQ.

---

## Data Flows (Sprint 1)

**Core idea:** the Backend **saves** the rules. The MCP Server **enforces** them.

**Main path:** Channel → API Server → AI Service → MCP Server → External platforms

---

### Flow 1 — Channel Message

How an incoming message flows through the backend, the AI Service, and the MCP Server.

1. An end user sends a message through a channel (WhatsApp, chat widget, chat page).
2. The channel delivers the message to the API Server, which authenticates the request and identifies the workspace, channel, and conversation.
3. The API Server checks the conversation status. If it is `human_control`, the message goes to the assigned human member. Otherwise it continues.
4. The API Server saves the message via the Conversation Service and forwards the request to the AI Service.
5. The Orchestrator loads the conversation history from PostgreSQL.
6. The Orchestrator plans the task using internal subagents and decides which specialist agents to involve.
7. Each specialist asks the MCP Server: "what tools can I use?" The MCP Server returns only the actions enabled for that agent.
8. The specialist asks the MCP Server to run a tool.
9. The MCP Server runs the checks in order:
   - **Permission check** — is this tool enabled for this agent?
   - **Risk check** — does it need approval? If yes, pause and notify the Approval Service. (TODO: Flow 5)
10. The MCP Server retrieves credentials from the Credential Vault and runs the action through the Connector (Odoo, CRM, email). (TODO)
11. The MCP Server verifies the real result, writes the audit log, and returns the result to the AI Service. (TODO)
12. The result travels back: AI Service → API Server → Conversation Service saves the reply → channel delivers it.

---

### Flow 2 — Integration Setup

How a workspace connects an external platform and makes its tools available to agents.

1. An authorized user selects an integration in the dashboard (Odoo, CRM, email).
2. The frontend sends the request to the API Server, which authenticates it and checks the user's permissions.
3. The API Server forwards the request to the Integration Service.
4. The user completes authorization — OAuth flow or manual credentials — and the Integration Service tests the connection.
5. The credentials go into the Credential Vault. PostgreSQL stores only the integration record and a reference to the secret.
6. The Integration Service notifies the MCP Server that a new integration is connected for this workspace.
7. The MCP Server registers that integration's tools in the Tool Registry for this workspace.
8. The actions appear in the dashboard, ready to be assigned to agents.

---

### Flow 3 — Agent Configuration

How the rules are saved. The MCP Server enforces them when a task runs.

1. An authorized user creates or edits an agent in the dashboard.
2. The API Server authenticates the request and checks permissions.
3. The user sets the agent's instructions, knowledge sources, enabled actions, and channels.
4. The Agent Service validates the configuration.
5. The Agent Service saves it in PostgreSQL: which actions are enabled and which require approval.
6. The Channel Service links the agent to its assigned channels.
7. The agent becomes available in the workspace. When a task runs, the MCP Server reads these saved rules for its permission and risk checks.

---

### Flow 7 — Authentication

1. The user chooses email/password or Google OAuth.
2. The API Server forwards the request to the Auth Service.
3. For email/password: the Auth Service verifies the password and the email OTP. For Google: it redirects to Google and validates the response.
4. The Auth Service creates or retrieves the user record.
5. The Auth Service issues a JWT and returns it.
6. For a new user: the Workspace Service creates a default workspace and sets the user as Owner.

---

## Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│          Frontend (Web App)        Channels                  │
│                                 (WhatsApp / Widget)          │
└────────────────────────┬───────────────────┬─────────────────┘
                         │                   │
                         ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                        API Server                            │
│   Auth · Workspace · Agent · Integration · Channel ·         │
│   Conversation Services                                      │
└───────────────────────────────┬──────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      AI Service       │
                    │  Orchestrator +       │
                    │  Internal Subagents   │
                    │  LLM Providers        │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   FelOps MCP Server   │
                    │  Tool Registry        │
                    │  Permission Check     │
                    │  Risk Check           │
                    │  Connectors           │
                    │  Verify · Audit Log   │
                    └───────────┬───────────┘
                                │
          ┌─────────────────────┼────────────────────┐
          ▼                     ▼                    ▼
     PostgreSQL         Credential Vault     External Platforms
                                             (Odoo, CRM, etc.)
```
