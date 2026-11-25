# Implementation plan: Match Drizzle ORM schema with schema.dbml

Status: Done
Created: 2026-11-25
Feature brief: [brief.md](brief.md)

## 1. Goal

Replace the minimal `users`-only Drizzle schema in [api/src/database/schema.ts](../../../api/src/database/schema.ts) with the complete 8-enum, 16-table, 28-relationship PostgreSQL schema defined in [docs/database/schema.dbml](../../database/schema.dbml), wire `defineRelations` into [api/src/config/db.ts](../../../api/src/config/db.ts), decouple offline `drizzle-kit` commands from Infisical in [api/drizzle.config.ts](../../../api/drizzle.config.ts), and generate the corresponding Drizzle migration under `api/drizzle/`.

## 2. Authorization and scope

- Authorized by: User `/plan` request and confirmation of scope, non-null `timestamptz` defaults, domain-organized `api/src/database/` modules, and offline migration generation.
- In scope: `api/src/database/*`, `api/src/config/db.ts`, `api/drizzle.config.ts`, generated migration in `api/drizzle/`, `api/tests/unit/schema.test.ts`, `docs/work/drizzle-schema-sync/`, and `agent-metadata.md`.
- Out of scope: Running `database:migrate` against PostgreSQL/Supabase, business endpoints, and AI Service changes.
- Decisions still needed, if any: Explicit user authorization before running `database:migrate` in any future step.

## 3. Evidence and conventions

- Product constraints: [docs/project-context.md](../../project-context.md)
- Verified stack and commands: [agent-metadata.md](../../../agent-metadata.md), [api/package.json](../../../api/package.json), [docs/standards/engineering-conventions.md](../../standards/engineering-conventions.md)
- Existing patterns and relevant ADRs: `drizzle-orm@^1.0.0-rc.4` (`pgTable` array `extraConfig`, `integer().generatedAlwaysAsIdentity()`, `defineRelations` with `drizzle({ client: pool, relations })`), `drizzle-kit@^1.0.0-rc.4` directory-per-migration snapshots (`api/drizzle/20261004160319_init` and `20261004160522_init`), and ADRs 0006–0010.

## 4. Affected areas

- Existing files/modules: [api/src/database/schema.ts](../../../api/src/database/schema.ts), [api/src/config/db.ts](../../../api/src/config/db.ts), [api/drizzle.config.ts](../../../api/drizzle.config.ts), [agent-metadata.md](../../../agent-metadata.md)
- New files/directories: `api/src/database/{enums,auth,workspaces,agents,integrations,knowledge,conversations,relations,index}.ts`, generated migration directory under `api/drizzle/`, `api/tests/unit/schema.test.ts`, `docs/work/drizzle-schema-sync/{brief,plan}.md`
- Data, API, or compatibility effects: Breaking evolution to `users` (`name` shrinks `varchar(255)` -> `varchar(50)`, adds `password_hash`, `is_verified`, `created_at`, `updated_at`); adds 15 tables and 8 enums. No API routes changed.

## 5. Steps

1. Create domain-organized enum and table definitions under `api/src/database/`:
   - `enums.ts`: 8 `pgEnum` definitions matching `schema.dbml`.
   - `auth.ts`: `users`, `sessions`, `auth_codes`.
   - `workspaces.ts`: `workspaces`.
   - `agents.ts`: `agents`, `agents_actions`, `workspaces_channels`.
   - `integrations.ts`: `workspace_action_settings`, `workspaces_integrations`, `oauth_states`.
   - `knowledge.ts`: `knowledge_sources`, `agents_knowledge_sources`.
   - `conversations.ts`: `conversations`, `messages`, `executions`, `approvals`.
   - `schema.ts`: re-export all enums and tables.
   - `relations.ts`: `defineRelations(schema, ...)` for all 16 tables without colliding with column names.
   - `index.ts`: barrel exporting schema and `relations`.
2. Update `api/src/config/db.ts` to pass `relations` to `drizzle({ client: pool, relations })` and export `Database`.
3. Update `api/drizzle.config.ts` so `drizzle-kit` only loads `src/config/env.js` when Infisical bootstrap variables are present, falling back to `process.env.DATABASE_URL ?? ''` for offline `generate`/`check`/`export`, and generate the new migration under `api/drizzle/`.
4. Add credential-free unit tests in `api/tests/unit/schema.test.ts` validating all 8 enums, 16 tables, columns, indexes, primary keys, 28 foreign keys, and `defineRelations` wiring.
5. Run verification checks, fresh-eyes review, and update `agent-metadata.md` and completion evidence.

## 6. Verification

| Check | Command or evidence |
| --- | --- |
| Schema parity unit tests | `npx vitest run tests/unit/schema.test.ts --prefix api` |
| Lint, format, typecheck, build | `npm run lint --prefix api && npm run format:check --prefix api && npm run typecheck --prefix api && npm run build --prefix api` |
| Drizzle migration & DDL check | `npm run database:generate --prefix api && npx drizzle-kit check --config=api/drizzle.config.ts` |
| Documentation & workflow checks | `bash bin/check-backend-docs.sh && bash bin/check-agent-workflow.sh` |
| Integration test baseline | `npm test --prefix api` (expected to fail in `env.ts` without Infisical credentials; record exact result) |

## 7. Risks and rollback

- Risk: `users.name` shrinks from `varchar(255)` to `varchar(50)` and adds `NOT NULL` columns (`password_hash`), which would require data backfill on an existing populated `users` table before running `database:migrate`.
- Mitigation: `database:migrate` is not run in this task; migration SQL is generated and inspected against `schema.dbml`.
- Rollback: Revert the commit on `feature/auth` (`git revert`) to restore the prior `users`-only schema and `api/drizzle/` state.

## 8. Completion evidence

Completed on 2026-11-25 on branch `feature/auth`:

- `npx prettier --check src/database/*.ts src/config/db.ts drizzle.config.ts tests/unit/schema.test.ts` (from `api/`): Pass
- `npm run typecheck --prefix api`: Pass
- `npm run lint --prefix api`: Pass
- `npm run build --prefix api`: Pass
- `npm test --prefix api`: Pass (`tests/unit/schema.test.ts` 6/6 passed, `tests/integration/app.test.ts` 1/1 passed with local Infisical bootstrap credentials)
- `npx drizzle-kit generate --name=sync_schema` and `npx drizzle-kit check` (from `api/`): Pass (generated `api/drizzle/20261125202721_sync_schema/{migration.sql,snapshot.json}`)
- `bash bin/check-backend-docs.sh` and `bash bin/check-agent-workflow.sh`: Pass (re-verified after doc updates)
- `database:migrate`: Not run (out of scope without explicit authorization).
- Fresh-eyes review: `reviewer` subagent returned `verdict: "pass"` (0 blockers/majors/minors; 2 documentation nits resolved before commit).
