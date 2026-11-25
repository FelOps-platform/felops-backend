# Agent metadata

Verified technical and agent state. Paths are repository-relative. Product architecture in docs is labeled planned unless code implements it.

Last inspected: 2026-11-25 (docs use a flat `docs/` tree with root and docs README indexes. Feature pages carry planned status, approvals has a state diagram, architecture is a system overview and backend component index, integrations owns the user-facing OAuth lifecycle, ADR-0007 owns OAuth mechanics, actions owns tool-execution mechanics, and knowledge is selected from the workspace library only. Authentication is documented as a planned design in `docs/features/auth.md`. No application code or runtime behavior changed in this design pass. Earlier onboarding checks remain recorded below.)

## 1. Project identity

| Field | Value | Source |
| --- | --- | --- |
| Project name | FelOps Backend | [api/package.json](api/package.json), [api/README.md](api/README.md) |
| Owner / team | FelOps-platform repository | [PR #1](https://github.com/FelOps-platform/felops-backend/pull/1) |
| Status | Scaffold: the API currently implements a health route; product workflows remain planned | [api/src/app.ts](api/src/app.ts), [docs/architecture.md](docs/architecture.md) |
| Repository | FelOps-platform/felops-backend | [adoption plan](docs/work/agent-seed-adoption/plan.md) |
| Default branch | main (PR #1 targets main) | [PR #1](https://github.com/FelOps-platform/felops-backend/pull/1) |
| License | Unknown | Not established by inspected project sources |

## 2. Purpose and scope

- Problem: Product docs describe a multi-tenant automation platform connecting workspace users, agents, and external business systems. This is intended design, not current API behavior. [docs/architecture.md](docs/architecture.md), [Integrations](docs/features/integrations.md), [Actions](docs/features/actions.md)
- Users: Backend contributors; the product docs describe workspace users configuring integrations and agent actions. [Integrations](docs/features/integrations.md), [Actions](docs/features/actions.md)
- Implemented success: GET /api/v1/health returns status ok. [api/src/app.ts](api/src/app.ts), [api/tests/integration/app.test.ts](api/tests/integration/app.test.ts)
- Non-goals for this adoption: business endpoints, tool execution, database migrations, AI orchestration, and deployment. [brief](docs/work/agent-seed-adoption/brief.md)
- Limitation: Treat feature and architecture docs as proposed behavior unless backed by API code.
- Deferred scope: custom HTTP actions are not part of current product scope; only built-in integration actions are documented.

## 3. Stack and commands

| Area | Verified value | Source |
| --- | --- | --- |
| Languages | TypeScript API (ESM, NodeNext, `@/*` path alias) | [api/package.json](api/package.json), [api/tsconfig.json](api/tsconfig.json) |
| Frameworks | Express 5, Zod, Pino, Drizzle ORM, node-postgres | [api/package.json](api/package.json) |
| Package manager | npm; API lockfile is present; no root `package.json` or `engines` field | [api/package-lock.json](api/package-lock.json), [api/package.json](api/package.json) |
| Build | cd api && npm run build | [api/package.json](api/package.json) |
| Tests | cd api && npm test (Vitest); one health-route integration test is present | [api/package.json](api/package.json), [api/tests/integration/app.test.ts](api/tests/integration/app.test.ts) |
| Lint / format | cd api && npm run lint; cd api && npm run format:check | [api/package.json](api/package.json) |
| Type check | cd api && npm run typecheck | [api/package.json](api/package.json) |

TypeScript tooling versions are intentionally split between TypeScript 7 for compilation and a TypeScript 6 compatibility dependency for tooling that still needs the previous programmatic API. This compatibility layer is temporary.

## 4. Architecture

- Style: Express JSON API, with startup in [api/src/server.ts](api/src/server.ts) and app/routes in [api/src/app.ts](api/src/app.ts).
- Runtime configuration: [api/src/config/env.ts](api/src/config/env.ts) loads dotenv, fetches secrets, then validates NODE_ENV, LOG_LEVEL, PORT, and DATABASE_URL with Zod. Only NODE_ENV is read from `process.env`; LOG_LEVEL, PORT, and DATABASE_URL must be returned by the Infisical secret lookup. [api/src/integrations/infisical/fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) uses Infisical Universal Auth and selects the environment named by NODE_ENV. Missing bootstrap credentials fail startup at import time; an unset or unrecognized NODE_ENV falls back to development.
- Database: [api/src/config/db.ts](api/src/config/db.ts) configures a PostgreSQL pool and Drizzle. [api/src/database/schema.ts](api/src/database/schema.ts) currently defines a users table. The health route does not use the database.
- Logging: Pino and pino-http are configured in [api/src/config/logger.ts](api/src/config/logger.ts); development uses pino-pretty.
- Boundaries: api/ contains the implemented backend scaffold. AI work lives in the separate felops-ai project. The Backend owns the code integration, action, and channel registries; workspace action settings; agent configs; credentials; tool execution; approvals; and conversation messages; the AI Service owns checkpoints, Qdrant, ingestion jobs, SSE, and webhooks. [docs/architecture.md](docs/architecture.md), [AI Service contract](docs/ai-service-integration/ai-service-contract.md)

## 5. Repository map

- api/src/: Express app, runtime configuration, Infisical adapter, database setup, and schema.
- api/tests/: currently one integration test for the health route.
- docs/: architecture, API, database, feature, AI contract, engineering, onboarding, and work documentation.

## 6. Key files

| Path | Purpose |
| --- | --- |
| [api/src/app.ts](api/src/app.ts) | JSON middleware and implemented health route |
| [api/src/config/env.ts](api/src/config/env.ts) | Runtime environment and Zod validation |
| [api/src/integrations/infisical/fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) | Infisical Universal Auth secret retrieval |
| [api/src/config/db.ts](api/src/config/db.ts) | PostgreSQL pool and Drizzle client |
| [api/src/database/schema.ts](api/src/database/schema.ts) | Current users table schema |
| [api/package.json](api/package.json) | API scripts and dependencies |
| [docs/architecture.md](docs/architecture.md) | Proposed system architecture |
| [docs/api/api-design-outline.md](docs/api/api-design-outline.md) | API organization, shared errors, and OpenAPI generation approach |
| [docs/features/auth.md](docs/features/auth.md) | Planned authentication workflows, sessions, and auth decisions |

## 7. Configuration and secrets

| Item | Required | Where defined | Notes |
| --- | --- | --- | --- |
| INFISICAL_CLIENT_ID | Yes | [api/.env.example](api/.env.example), [fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) | Bootstrap credential; never record its value |
| INFISICAL_CLIENT_SECRET | Yes | [api/.env.example](api/.env.example), [fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) | Bootstrap credential; never record its value |
| INFISICAL_PROJECT_ID | Yes | [api/.env.example](api/.env.example), [fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) | Selects the Infisical project |
| NODE_ENV | Defaults to development | [api/src/config/env.ts](api/src/config/env.ts) | Allowed values: development, production, test; selects the Infisical environment |
| LOG_LEVEL, PORT, DATABASE_URL | Required by validation | [api/src/config/env.ts](api/src/config/env.ts) | Must be present in the fetched Infisical secrets; no secret values belong in docs |

## 8. Data and storage

| Store | Type | Used for | Main entities |
| --- | --- | --- | --- |
| PostgreSQL | Relational, via pg and Drizzle | Configured database connection | users table only in the current schema |

Migration commands/configuration exist in [api/package.json](api/package.json) and [api/drizzle.config.ts](api/drizzle.config.ts). Two initial migrations are present: the first creates `users` with an `age` column, and the second drops `age`, leaving the executable `users` schema. `api/drizzle/meta/_journal.json` is absent, so migration viability is Unknown. No migration behavior was verified for this task.

## 9. Integrations

| Integration | Direction | Auth method | State |
| --- | --- | --- | --- |
| Infisical | API fetches runtime secrets | Universal Auth | Implemented in [fetch-secrets.ts](api/src/integrations/infisical/fetch-secrets.ts) |
| PostgreSQL | API database connection | DATABASE_URL | Connection module and schema are present; business data flows are not implemented |
| Business systems / Backend tool execution | Proposed backend execution of actions | Unknown | Documented plans only; see [architecture](docs/architecture.md), [Integrations](docs/features/integrations.md), and [Actions](docs/features/actions.md) |

## 10. Agent behavior

The backend repository does not implement AI orchestration or tool execution. AI work belongs to the separate felops-ai project; this repository's architecture describes an async AI service and a Backend-owned tool executor as intended components. The Backend sends current agent configs, receives webhooks, and executes tool calls; provider credentials never leave the Backend. Runtime tools, memory/retrieval, evaluations, and handoff behavior remain unknown here. [docs/architecture.md](docs/architecture.md), [AI Service contract](docs/ai-service-integration/ai-service-contract.md)

Coding-agent routing: explorer uses the fast tier; implementer and reviewer use the balanced tier. The host maps tiers to available models without model pins; see [agent routing](docs/standards/agent-routing.md). This is a development workflow, separate from the product's planned AI Service.

Coding-agent host configuration: each host has its own surface. Claude Code uses `.claude/` and `CLAUDE.md`; Cursor uses `.cursor/`; OpenCode uses `.opencode/` (agents, commands, and a docs-reminder plugin), a repository-root `opencode.json` with approval prompts for migrations, vault/database writes, publishes, and pushes, plus `AGENTS.md`, and reads `.claude/skills` natively. The `.opencode/` files are ports of their `.claude` counterparts, except the OpenCode-only `/design` command, so `.claude/` stays canonical for ports; see [.opencode/README.md](.opencode/README.md). Verified on 2026-10-22 with `opencode debug agents` (explorer, implementer, and reviewer loaded as subagents), `opencode plugin list` (doc-reminder loaded), and `bin/check-opencode-config.sh`, which drives the reminder in a temporary repository; `bin/check-agent-workflow.sh` covers adapter parity and local links, and also runs the backend documentation check. The OpenCode commands are `/onboard`, `/design`, `/plan`, `/implement`, and `/ship`; they were not listed through the API from this location, so their registration is not independently verified. Because the OpenCode role files omit `model`, the explorer's fast-tier intent is enforced only when the coordinator binds a model at launch; the role itself inherits the caller's model.

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
- Checks passed on the 2026-10-22 onboarding re-check: npm run lint --prefix api, npm run typecheck --prefix api, and npm run build --prefix api.
- npm test --prefix api failed at the import-time Infisical credential guard with credentials cleared, before test collection. No tests were collected; the test suite is not green. It was not re-run during onboarding, so this recorded limitation stands.
- Root workflow check passed on 2026-11-21: adapter parity, helper syntax, local links, and configured hook launches.
- OpenCode config check passed on 2026-11-21: agent frontmatter, secret-file rules, approval rules, command parity, and the docs-reminder plugin in a temporary repository.
- Backend documentation consistency check passed on 2026-11-21 after finalizing the backend component index, database relationships, workspace assignment flows, and OAuth/tool-execution ownership. API lint, typecheck, and build passed on 2026-11-21; no application source changed.
- Backend documentation consistency check passed on 2026-11-25 after finalizing the planned authentication design. The DBML schema defines 16 tables and 28 relationships (`@dbml/core` 12.1.0 parsed the 16-table/28-relationship structure prior to adding `[not null]` on `users.is_verified`). No application source changed.
- CI covers only the two agent-config checks: `.github/workflows/agent-workflow.yml` and `.github/workflows/opencode-config.yml` run on pull requests and pushes to `main`. No lint, typecheck, build, or test workflow exists.
- Docs PR #1 targets main and was open when checked on 2026-10-22. Treat its proposed docs as unmerged, non-implementation evidence. [PR #1](https://github.com/FelOps-platform/felops-backend/pull/1)
