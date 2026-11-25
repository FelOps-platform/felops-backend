# Project context

Source inspected 2026-10-22; product docs reconciled 2026-11-20. Product descriptions below distinguish current code from proposed workflows.

## Product

- What it is: This repository contains the FelOps backend API scaffold. Product docs describe a multi-tenant automation platform where workspace users configure integrations and agent actions. [api/src/app.ts](../api/src/app.ts), [Architecture](architecture.md), [Integrations](features/integrations.md), [Actions](features/actions.md)
- Problem: The planned product connects workspace workflows to external business systems through configured actions and agents. The backend code currently exposes only a health endpoint; those workflows are not implemented here.
- Users: Backend contributors; the documented product workflows are for workspace users configuring integrations and allowed actions. [Integrations](features/integrations.md), [Actions](features/actions.md)
- Success looks like: Current implemented behavior is GET /api/v1/health returning status ok. Product outcomes such as integration setup, action permissions, and execution history remain proposed. [api/src/app.ts](../api/src/app.ts), [Integrations](features/integrations.md), [Actions](features/actions.md)
- Non-goals: This repository's docs adoption does not implement business endpoints, tool execution, migrations, AI orchestration, or deployment. AI work remains in the separate felops-ai project; do not move that stack into this repository. [adoption brief](work/agent-seed-adoption/brief.md)
- Deferred scope: custom HTTP actions are not part of current product scope; only built-in integration actions are documented.

## Implemented and planned

| Area | Current state | Evidence |
| --- | --- | --- |
| API | Express app with JSON middleware and one health route | [api/src/app.ts](../api/src/app.ts), [api/src/server.ts](../api/src/server.ts) |
| Runtime config | Infisical Universal Auth retrieval followed by Zod validation | [api/src/config/env.ts](../api/src/config/env.ts), [api/src/integrations/infisical/fetch-secrets.ts](../api/src/integrations/infisical/fetch-secrets.ts) |
| Database | PostgreSQL/Drizzle connection module and users schema; health route has no database flow | [api/src/config/db.ts](../api/src/config/db.ts), [api/src/database/schema.ts](../api/src/database/schema.ts) |
| Tool execution | Backend-owned planned workflow; no runtime yet | [Architecture](architecture.md#components), [AI Service contract](ai-service-integration/ai-service-contract.md), [Actions](features/actions.md) |
| AI | Separate felops-ai project per repository boundary; async turns, approvals, and ingestion | [Architecture](architecture.md) |
| Product workflows | Authentication, integrations, actions, knowledge, agents, approvals, and channels are documented, not implemented in the API | [Authentication](features/auth.md), [Actions](features/actions.md) |

## Constraints

- The backend code and npm scripts are under api/. The Backend calls the AI Service over internal HTTP; the AI Service calls the Backend for tools, catalog, and webhooks. [api/package.json](../api/package.json)
- API startup requires Infisical bootstrap credentials and validates runtime settings including LOG_LEVEL, PORT, and DATABASE_URL. This runtime secret integration does not specify access to user or workspace vault data. [api/.env.example](../api/.env.example), [api/src/config/env.ts](../api/src/config/env.ts)
- Hosting, deployment target, and production runtime requirements are unknown; do not infer them from the package scripts.
- Documentation PR #1 targets main and was still open when checked on 2026-10-22. Its proposed Sprint 1 flow and other docs are not evidence of implemented behavior. [PR #1](https://github.com/FelOps-platform/felops-backend/pull/1)

## Terminology

| Term | Meaning |
| --- | --- |
| API Server | The implemented Express process in api/src/server.ts and api/src/app.ts |
| AI Service | A separate service described in the architecture docs; AI work lives in felops-ai |
| Tool call | A Backend-executed run of a catalog tool. The AI Service sends the integration key, tool key, arguments, and an idempotency key. |
| Action | A code-defined catalog tool exposed by an integration, with a workspace availability setting plus database grants and executions. |
| Agent config | Per-turn instructions, tool grants, approval flags, and catalog version sent by the Backend. |
| Channel | A workspace deployment instance of a code-defined channel type, with at most one operating agent. |
| Knowledge source | A workspace-owned URL, file, or plaintext source that agents select; ingested into Qdrant. |
| Integration | A code-defined external business system with a database-backed OAuth workspace connection. |

## Sources

- [API package and lockfile](../api/package.json), [API README](../api/README.md)
- [API app](../api/src/app.ts), [runtime config](../api/src/config/env.ts), [Infisical adapter](../api/src/integrations/infisical/fetch-secrets.ts), [database module](../api/src/config/db.ts), and [schema](../api/src/database/schema.ts)
- [Architecture](architecture.md), [API outline](api/api-design-outline.md), [Integrations](features/integrations.md), and [Actions](features/actions.md)
- [Adoption brief](work/agent-seed-adoption/brief.md) and [adoption plan](work/agent-seed-adoption/plan.md)
- [Pending documentation PR #1](https://github.com/FelOps-platform/felops-backend/pull/1), checked open against main on 2026-10-22
