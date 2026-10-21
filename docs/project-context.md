# Project context

Source and docs inspected 2026-10-22. Product descriptions below distinguish current code from proposed workflows.

## Product

- What it is: This repository contains the FelOps backend API scaffold. Product docs describe a multi-tenant automation platform where workspace users configure integrations and agent actions. [api/src/app.ts](../api/src/app.ts), [api/docs/architecture.md](../api/docs/architecture.md), [api/docs/features/actions.md](../api/docs/features/actions.md)
- Problem: The planned product connects workspace workflows to external business systems through configured actions and agents. The backend code currently exposes only a health endpoint; those workflows are not implemented here.
- Users: Backend contributors; the documented product workflows are for workspace users configuring integrations and allowed actions. [api/docs/features/integrations.md](../api/docs/features/integrations.md), [api/docs/features/actions.md](../api/docs/features/actions.md)
- Success looks like: Current implemented behavior is GET /api/v1/health returning status ok. Product outcomes such as integration setup, action permissions, and execution history remain proposed. [api/src/app.ts](../api/src/app.ts), [api/docs/features/actions.md](../api/docs/features/actions.md)
- Non-goals: This repository's docs adoption does not implement business endpoints, MCP runtime, migrations, AI orchestration, or deployment. AI work remains in the separate felops-ai project; do not move that stack into this repository. [adoption brief](work/agent-seed-adoption/brief.md)

## Implemented and planned

| Area | Current state | Evidence |
| --- | --- | --- |
| API | Express app with JSON middleware and one health route | [api/src/app.ts](../api/src/app.ts), [api/src/server.ts](../api/src/server.ts) |
| Runtime config | Infisical Universal Auth retrieval followed by Zod validation | [api/src/config/env.ts](../api/src/config/env.ts), [api/src/integrations/infisical/fetch-secrets.ts](../api/src/integrations/infisical/fetch-secrets.ts) |
| Database | PostgreSQL/Drizzle connection module and users schema; health route has no database flow | [api/src/config/db.ts](../api/src/config/db.ts), [api/src/database/schema.ts](../api/src/database/schema.ts) |
| MCP | Package placeholder only; no MCP server runtime | [mcp-server/package.json](../mcp-server/package.json) |
| AI | Separate felops-ai project per repository boundary; API architecture describes a separate AI service as planned | [api/docs/architecture.md](../api/docs/architecture.md) |
| Product workflows | Integrations, action permissions/approval, and execution history are documented, not implemented in the API | [api/docs/features/integrations.md](../api/docs/features/integrations.md), [api/docs/features/actions.md](../api/docs/features/actions.md) |

## Constraints

- The backend code and npm scripts are under api/. The mcp-server directory is a package placeholder. [api/package.json](../api/package.json), [mcp-server/package.json](../mcp-server/package.json)
- API startup requires Infisical bootstrap credentials and validates runtime settings including LOG_LEVEL, PORT, and DATABASE_URL. This runtime secret integration does not specify access to user or workspace vault data. [api/.env.example](../api/.env.example), [api/src/config/env.ts](../api/src/config/env.ts)
- Hosting, deployment target, and production runtime requirements are unknown; do not infer them from the package scripts.
- Documentation PR #1 targets main and was still open when checked on 2026-10-22. Its proposed Sprint 1 flow and other docs are not evidence of implemented behavior. [PR #1](https://github.com/FelOps-platform/felops-backend/pull/1)

## Terminology

| Term | Meaning |
| --- | --- |
| API Server | The implemented Express process in api/src/server.ts and api/src/app.ts |
| AI Service | A separate service described in the architecture docs; AI work lives in felops-ai |
| MCP Server | Proposed tool execution component; the local mcp-server package has no runtime |
| Action | A proposed operation on a connected business system, with agent permissions and approval described in feature docs |
| Saved rules | The planned Backend stores rules in PostgreSQL; MCP enforces them. Whether MCP copies rules or queries the backend remains open. |
| Integration | A proposed workspace connection to an external business system; workflows are documented but not implemented |

## Open decisions

- Product credentials: Will the MCP Server read workspace secrets directly from the vault, or receive them per request from the backend? Infisical access in the API currently retrieves application runtime configuration only; it does not settle product vault access.
- Rules synchronization: The pending design has the Backend save rules in PostgreSQL and MCP enforce them. Will MCP keep its own copy or query the backend each time? This contract is unresolved and no MCP runtime implements it.

## Sources

- [API package and lockfile](../api/package.json), [API README](../api/README.md), and [MCP package](../mcp-server/package.json)
- [API app](../api/src/app.ts), [runtime config](../api/src/config/env.ts), [Infisical adapter](../api/src/integrations/infisical/fetch-secrets.ts), [database module](../api/src/config/db.ts), and [schema](../api/src/database/schema.ts)
- [Architecture](../api/docs/architecture.md), [actions](../api/docs/features/actions.md), and [integrations](../api/docs/features/integrations.md)
- [Adoption brief](work/agent-seed-adoption/brief.md) and [adoption plan](work/agent-seed-adoption/plan.md)
- [Pending documentation PR #1](https://github.com/FelOps-platform/felops-backend/pull/1), checked open against main on 2026-10-22
