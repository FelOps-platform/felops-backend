# FelOps backend

TypeScript/Express API in `api/` (ESM, NodeNext). Implemented endpoints cover `GET /api/v1/health`, Auth (`/api/v1/auth/*`), and owner-scoped Workspaces (`/api/v1/workspaces/*`); other product workflows in `docs/` remain planned. Treat unverified facts as Unknown.

Stack: Express 5, TypeScript 7 (temporary TS 6 compat dep), Zod 4, Drizzle ORM, `pg`/PostgreSQL, Pino, Vitest 5 + `@electric-sql/pglite`, Argon2id, `jose`, SendGrid, Infisical runtime secrets.

## Commands

Run from repo root (`api/package.json` and `bin/` are the source of truth):

| Task | Command |
| --- | --- |
| Install (preserves `core.hooksPath`) | `npm ci --prefix api --ignore-scripts` |
| Lint / typecheck / build | `npm run lint --prefix api` · `npm run typecheck --prefix api` · `npm run build --prefix api` |
| Format check | `npm run format:check --prefix api` |
| OpenAPI generate / check | `npm run openapi:generate --prefix api` · `npm run openapi:check --prefix api` |
| Test (offline PGlite Postgres) | `npm test --prefix api` |
| Docs / agent harness checks | `bash bin/check-backend-docs.sh` · `bash bin/check-agent-workflow.sh` |
| Diff incl. untracked files | `bash bin/diff.sh` |

Server startup loads runtime secrets from Infisical (`api/.env.example` names bootstrap vars); tests run offline via PGlite without Infisical creds. Never invent creds or contact a shared vault.

## Invariants

- **Service boundary:** Backend owns catalog, agent configs, credentials, tool execution, approvals, conversations, and messages. AI Service (`FelOps-platform/felops-ai`, FastAPI/LangGraph) owns checkpoints, Qdrant, ingestion, SSE, and webhooks — keep its stack out of this repo. Provider credentials never leave the Backend.
- **Explicit authorization required:** `database:migrate`, `drizzle-kit migrate|push`, Supabase writes, connecting integrations, deployment, destructive git, pushes, merges, external messages.
- **Do not regenerate** lockfile, migrations, or unrelated formatting unprompted. Regenerate `docs/api/openapi.client.yaml` only via `npm run openapi:generate --prefix api` when routes or Zod schemas change. Keep `core.hooksPath`; run checks explicitly. Never commit secrets or claim unverified checks/reviews.
- `api/eslint.config.mjs` already enforces `no-console`, bootstrap-only `process.env`, import-layer boundaries, and `consistent-type-imports`; do not restate or bypass them.

## Working agreement

- Clear requests authorize their stated scope; clarify only behavior/scope/risk ambiguity. Plan-only requests stop at the plan. Ask before expanding scope.
- Flow: clarify → explore → plan (substantial work) → implement → verify → fresh review → ship, within Design → Implementation → Deployment ([`docs/delivery.md`](docs/delivery.md)).
- Substantial work gets one self-contained `docs/work/<slug>/` folder ([`docs/work/README.md`](docs/work/README.md)); durable decisions go in `docs/adr/`. A fresh reviewer (never the implementer) reviews substantive changes.
- Split multi-concern work into cohesive, checked local commits without asking (stage only its paths, check diff for secrets, never amend published history, never commit plan-only/failing work).
- With a remote, fast-forward clean local default branch (`origin/HEAD`) at session start and before shipping. Push/merge/deploy only when requested; never reset, force, auto-stash, or discard others' edits.

## Routing (read on demand)

| Task | Read |
| --- | --- |
| Product scope, terminology, verified technical state | `docs/project-context.md` |
| Architecture & components | `docs/architecture.md` |
| API design, error codes, OpenAPI rules | `docs/api/api-design-outline.md`, `docs/standards/engineering-conventions.md` |
| Schema or database | `docs/database/schema.dbml`, `docs/database/database.md` |
| Feature workflow | `docs/features/<feature>.md`, `docs/standards/document-conventions.md` |
| AI Service boundary (protected; edit only if asked; read section only) | `docs/ai-service-integration/ai-service-contract.md` |
| Routine `api/` code & golden blueprints | skill `express-api`, `api/src/modules/workspaces/` (minimal CRUD+auth), `api/src/modules/auth/` (multi-workflow+tx), `api/tests/helpers/test-runtime.ts` (PGlite) |
| `api/src/{app,routes,server}.ts`, global middleware/errors, Apidog OpenAPI, full `api/` PR review | `docs/standards/express-conventions.md` |
| LLM calls, tools, RAG, agent behavior | `docs/standards/ai-engineering-rules.md` |
| Decisions, work records, templates, docs index | `docs/adr/`, `docs/work/README.md`, `docs/templates/`, `docs/README.md` |

## Agent harness

- Canonical skills & commands (`/onboard /design /plan /implement /ship`): `.agents/skills/` (all hosts).
- Canonical roles (`explorer`, `implementer`, `reviewer`): `.agents/roles/`; host adapters stay thin pointers.
- Layout, host notes, tiers, and checks: [`.agents/README.md`](.agents/README.md).
