# Agent metadata

Verified technical and agent state. Paths are repository-relative. Product architecture in docs is labeled planned unless code implements it.

Last inspected: 2026-10-22 (source and docs inspection plus backend checks: lint, typecheck, and build passed; the test suite stopped at the Infisical credential guard)

## 1. Project identity

| Field | Value | Source |
| --- | --- | --- |
| Project name | FelOps Backend | [api/package.json](api/package.json), [api/README.md](api/README.md) |
| Owner / team | FelOps-platform repository | [PR #1](https://github.com/FelOps-platform/felops-backend/pull/1) |
| Status | Scaffold: the API currently implements a health route; product workflows remain planned | [api/src/app.ts](api/src/app.ts), [api/docs/architecture.md](api/docs/architecture.md) |
| Repository | FelOps-platform/felops-backend | [adoption plan](docs/work/agent-seed-adoption/plan.md) |
| Default branch | main (PR #1 targets main) | [PR #1](https://github.com/FelOps-platform/felops-backend/pull/1) |
| License | Unknown | Not established by inspected project sources |

## 2. Purpose and scope

- Problem: Product docs describe a multi-tenant automation platform connecting workspace users, agents, and external business systems. This is intended design, not current API behavior. [api/docs/architecture.md](api/docs/architecture.md), [api/docs/features/integrations.md](api/docs/features/integrations.md)
- Users: Backend contributors; the product docs describe workspace users configuring integrations and agent actions. [api/docs/features/actions.md](api/docs/features/actions.md)
- Implemented success: GET /api/v1/health returns status ok. [api/src/app.ts](api/src/app.ts), [api/tests/integration/app.test.ts](api/tests/integration/app.test.ts)
- Non-goals for this adoption: business endpoints, MCP runtime, database migrations, AI orchestration, and deployment. [brief](docs/work/agent-seed-adoption/brief.md)
- Limitation: Treat feature and architecture docs as proposed behavior unless backed by API code.

## 3. Stack and commands

| Area | Verified value | Source |
| --- | --- | --- |
| Languages | TypeScript API; mcp-server has package metadata only | [api/package.json](api/package.json), [mcp-server/package.json](mcp-server/package.json) |
| Frameworks | Express 5, Zod, Pino, Drizzle ORM, node-postgres | [api/package.json](api/package.json) |
| Package manager | npm; API lockfile is present | [api/package-lock.json](api/package-lock.json) |
| Build | cd api && npm run build | [api/package.json](api/package.json) |
| Tests | cd api && npm test (Vitest); one health-route integration test is present | [api/package.json](api/package.json), [api/tests/integration/app.test.ts](api/tests/integration/app.test.ts) |
| Lint / format | cd api && npm run lint; cd api && npm run format:check | [api/package.json](api/package.json) |
| Type check | cd api && npm run typecheck | [api/package.json](api/package.json) |

TypeScript tooling versions are intentionally split between TypeScript 7 for compilation and a TypeScript 6 compatibility dependency for tooling, as documented in [api/docs/clarifications/typescript-tooling.md](api/docs/clarifications/typescript-tooling.md).

The mcp-server package is CommonJS metadata with a placeholder test script; it has no server implementation in this repository. [mcp-server/package.json](mcp-server/package.json)

## 4. Architecture

- Style: Express JSON API, with startup in [api/src/server.ts](api/src/server.ts) and app/routes in [api/src/app.ts](api/src/app.ts).
- Runtime configuration: [api/src/config/env.ts](api/src/config/env.ts) loads dotenv, fetches secrets, then validates NODE_ENV, LOG_LEVEL, PORT, and DATABASE_URL with Zod. [api/src/integrations/infisical/fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) uses Infisical Universal Auth and selects the environment named by NODE_ENV. Missing bootstrap credentials fail startup; an unset or unrecognized NODE_ENV falls back to development.
- Database: [api/src/config/db.ts](api/src/config/db.ts) configures a PostgreSQL pool and Drizzle. [api/src/database/schema.ts](api/src/database/schema.ts) currently defines a users table. The health route does not use the database.
- Logging: Pino and pino-http are configured in [api/src/config/logger.ts](api/src/config/logger.ts); development uses pino-pretty.
- Boundaries: api/ contains the implemented backend scaffold. AI work lives in the separate felops-ai project (task-provided boundary); this repository's architecture doc describes the AI service as a separate FastAPI component. The local mcp-server package is only a placeholder. [api/docs/architecture.md](api/docs/architecture.md), [mcp-server/package.json](mcp-server/package.json)

## 5. Repository map

- api/src/: Express app, runtime configuration, Infisical adapter, database setup, and schema.
- api/tests/: currently one integration test for the health route.
- api/docs/: architecture and proposed feature workflows.
- mcp-server/: package placeholder only.
- docs/: contributor workflow and Agent Seed adoption materials.

## 6. Key files

| Path | Purpose |
| --- | --- |
| [api/src/app.ts](api/src/app.ts) | JSON middleware and implemented health route |
| [api/src/config/env.ts](api/src/config/env.ts) | Runtime environment and Zod validation |
| [api/src/integrations/infisical/fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) | Infisical Universal Auth secret retrieval |
| [api/src/config/db.ts](api/src/config/db.ts) | PostgreSQL pool and Drizzle client |
| [api/src/database/schema.ts](api/src/database/schema.ts) | Current users table schema |
| [api/package.json](api/package.json) | API scripts and dependencies |
| [api/docs/architecture.md](api/docs/architecture.md) | Proposed system architecture |
| [mcp-server/package.json](mcp-server/package.json) | MCP package placeholder |

## 7. Configuration and secrets

| Item | Required | Where defined | Notes |
| --- | --- | --- | --- |
| INFISICAL_CLIENT_ID | Yes | [api/.env.example](api/.env.example), [fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) | Bootstrap credential; never record its value |
| INFISICAL_CLIENT_SECRET | Yes | [api/.env.example](api/.env.example), [fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) | Bootstrap credential; never record its value |
| INFISICAL_PROJECT_ID | Yes | [api/.env.example](api/.env.example), [fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) | Selects the Infisical project |
| NODE_ENV | Defaults to development | [api/src/config/env.ts](api/src/config/env.ts) | Allowed values: development, production, test; selects the Infisical environment |
| LOG_LEVEL, PORT, DATABASE_URL | Required by validation | [api/src/config/env.ts](api/src/config/env.ts) | Values are validated after secret retrieval; no secret values belong in docs |

## 8. Data and storage

| Store | Type | Used for | Main entities |
| --- | --- | --- | --- |
| PostgreSQL | Relational, via pg and Drizzle | Configured database connection | users table only in the current schema |

Migration commands/configuration exist in [api/package.json](api/package.json) and [api/drizzle.config.ts](api/drizzle.config.ts); no migration behavior was verified for this task.

## 9. Integrations

| Integration | Direction | Auth method | State |
| --- | --- | --- | --- |
| Infisical | API fetches runtime secrets | Universal Auth | Implemented in [fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) |
| PostgreSQL | API database connection | DATABASE_URL | Connection module and schema are present; business data flows are not implemented |
| Business systems / MCP tools | Proposed API and AI workflows | Unknown | Documented plans only; see [architecture](api/docs/architecture.md) and [actions](api/docs/features/actions.md) |

## 10. Agent behavior

The backend repository does not implement AI orchestration. AI work belongs to the separate felops-ai project; this repository's architecture describes a separate AI service and MCP server as intended components. Runtime tools, memory/retrieval, evaluations, and handoff behavior are unknown here. [api/docs/architecture.md](api/docs/architecture.md)

Coding-agent routing: explorer uses the fast tier; implementer and reviewer use the balanced tier. The host maps tiers to available models without model pins; see [agent routing](docs/agent-routing.md). This is a development workflow, separate from the product's planned AI Service.

Coding-agent host configuration: each host has its own surface. Claude Code uses `.claude/` and `CLAUDE.md`; Cursor uses `.cursor/`; OpenCode uses `.opencode/` (agents, commands, and a docs-reminder plugin), a repository-root `opencode.json` with approval prompts for migrations, vault/database writes, publishes, and pushes, plus `AGENTS.md`, and reads `.claude/skills` natively. The `.opencode/` files are ports of their `.claude` counterparts, so `.claude/` stays canonical; see [.opencode/README.md](.opencode/README.md). Verified on 2026-10-22 with `opencode debug agents` (explorer, implementer, and reviewer loaded as subagents), `opencode plugin list` (doc-reminder loaded), and `bin/check-opencode-config.sh`, which drives the reminder in a temporary repository; that script is separate from `bin/check-agent-workflow.sh`, which is unchanged. The four OpenCode commands were not listed through the API from this location, so their registration is not independently verified.

## 11. Deployment and operations

| Field | Value |
| --- | --- |
| Hosting | Unknown |
| Environments | development, production, test in API configuration |
| Logs | Pino application and HTTP logging; no external monitoring verified |
| Monitoring | Unknown |
| Rollback | Unknown |

## 12. Verification and evidence

- Dependency install passed: npm ci --prefix api --ignore-scripts --no-audit --no-fund (402 packages).
- Checks passed: npm run lint --prefix api, npm run typecheck --prefix api, and npm run build --prefix api.
- npm test --prefix api failed at the import-time Infisical credential guard with credentials cleared, before test collection. No tests were collected; the test suite is not green.
- Root workflow check, bash bin/check-agent-workflow.sh, passed: configuration, adapter parity, helper syntax, and local workflow links.
- OpenCode config check, bash bin/check-opencode-config.sh, passed: agent frontmatter, secret-file rules, approval rules, command parity, and the docs-reminder plugin in a temporary repository.
- Docs PR #1 targets main and was open when checked on 2026-10-22. Treat its proposed docs as unmerged, non-implementation evidence. [PR #1](https://github.com/FelOps-platform/felops-backend/pull/1)

## 13. Open unknowns

- Product credentials: Will the MCP Server read workspace secrets directly from the vault, or receive them per request from the backend? API Infisical bootstrap access only establishes application configuration retrieval, not this product contract. [Pending PR #1](https://github.com/FelOps-platform/felops-backend/pull/1)
- Rules synchronization: The planned Backend saves rules in PostgreSQL and MCP enforces them. Will MCP keep a copy or query the backend each time? This access contract remains unresolved; no MCP runtime implements it. [Pending PR #1](https://github.com/FelOps-platform/felops-backend/pull/1)
