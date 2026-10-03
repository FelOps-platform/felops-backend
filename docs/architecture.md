# System Architecture

## Overview of Layers/Modules

Felops is a multi-tenant SaaS automation platform. It is organized into the following layers. The system is split into two independently deployed services that communicate over an internal API: the Backend (Express.js / TypeScript) and the AI Service (FastAPI).

### Client Layer

- Frontend (Web App): React + TypeScript web app that communicates with the API.
- Mobile App: Flutter app providing mobile access to a supported subset of features.

### API Layer

- API Server: Express.js (TypeScript) server that receives requests and routes them to the backend services.

### Core Services Layer (Backend: Express.js / TypeScript)

- Auth Service: authentication and session management.
- Workspace Service: workspace membership, roles, and settings.
- Agent Service: specialized agent configuration and behavior (Customer Support, HR, Operations, Sales).
- Integration Service: workspace-level integrations with external platforms.
- Channel Service: workspace channels, their types, and the specialist agents assigned to each channel.
- Billing Service: billing settings and plans.
- Conversation Service: conversation state and history.

### AI Service (FastAPI)

- Agent Execution Coordinator / Orchestrator: internal and not user-managed. Receives messages from a channel and decides how to orchestrate the specialist agents assigned to that channel to perform the task.
- Internal Subagents: support internal orchestration tasks (e.g., planning), not user-created specialist agents.
- LLM Providers: GPT, Gemini, Claude, and DeepSeek models.
- MCP Server: exposes authorized tools to agents.

### Integrations & Actions (Workspace Level)

- Integrations: external business systems (e.g., CRM, email, ERP) connected at the workspace level.
- Actions: workspace-level built-in and custom API actions. Each agent is granted access only to the subset of actions it needs.

### Real-time / Notification Layer

- WebSockets Server: real-time communication.
- Mobile Notifications Service: sends urgent push notifications.

### Data Layer

- Relational Database (PostgreSQL): users, workspaces, agents, channels, permissions, and execution records.
- Vector Database (ChromaDB): stores knowledge embeddings for retrieval.
- Caching Database (Redis): speeds up repeated access to common data.
- Message Queue (RabbitMQ): async and background jobs (knowledge ingestion, sending emails, mobile notifications).

## Data Flow

### Channel message

How an incoming message flows through the Backend and AI Service.

1. An end-user sends a message through a channel (WhatsApp, chat bubble, chat page).
2. The channel delivers the message to the Backend's API Server (Express.js), which authenticates the request and identifies the workspace, channel, and conversation.
3. The API Server forwards the request to the AI Service (FastAPI) over the internal API.
4. The Orchestrator plans the task via internal subagents and retrieves relevant knowledge (ChromaDB) and conversation history (PostgreSQL).
5. The Orchestrator decides how to coordinate the specialist agents assigned to that channel.
6. Each specialist uses an LLM and the MCP Server, which exposes only that agent's allowed actions (validated against the user's permissions).
7. The MCP Server executes the action through the appropriate external integration (CRM, email, ERP).
8. If an action requires approval, execution pauses and the approval request is sent back through the API; an authorized user approves or rejects it, then execution proceeds or stops.
9. The result returns through the AI Service → internal API → Backend API Server → the originating channel.

### Background tasks & notification flow

1. Long-running or external tasks (knowledge ingestion, sending emails, push notifications) are placed on RabbitMQ.
2. Workers process the queue with retries for temporary failures and per-integration rate limits.
3. Urgent events are delivered to the Mobile Notifications Service (push) and to clients via WebSockets.

## Component Diagrams

The components and their relationships are illustrated in the diagram below.

Architecture components diagram: [Felops System Components Architecture](https://app.eraser.io/workspace/w7qDT3WCCC25KCmk3YPX?diagram=1MgUhF1iof0n60GW4wXV&layout=canvas)
