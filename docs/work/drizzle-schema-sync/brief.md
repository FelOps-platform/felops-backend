# Match Drizzle ORM Schema with schema.dbml

Status: Done
Created: 2026-11-25

## Goal

Align the TypeScript Drizzle ORM schema, Drizzle v1 RC relations, database client wiring, and Drizzle Kit migration artifacts in `api/` with the canonical database design in [schema.dbml](../../database/schema.dbml) and [database.md](../../database/database.md).

## Acceptance criteria

- [x] All 8 PostgreSQL enums from `docs/database/schema.dbml` are defined with `pgEnum` using exact snake_case names and values.
- [x] All 16 tables from `docs/database/schema.dbml` are organized by domain under `api/src/database/` and re-exported through `api/src/database/schema.ts` and `api/src/database/index.ts`.
- [x] All columns, types, lengths, defaults, non-null constraints (including non-null `timestamptz` audit columns with `defaultNow()` and `$onUpdate` on `updated_at`), primary keys, composite primary keys, unique indexes, non-unique indexes, and all 28 foreign-key relationships (with exact `onDelete` actions) match `schema.dbml`.
- [x] Drizzle Relations v2 (`defineRelations`) covers all 16 tables without relation/column name collisions and is wired into `api/src/config/db.ts`.
- [x] `api/drizzle.config.ts` supports offline `drizzle-kit generate` / `check` / `export` without Infisical bootstrap credentials while continuing to use Infisical `DATABASE_URL` when bootstrap credentials are present.
- [x] A new Drizzle migration matching the full schema diff is generated under `api/drizzle/` without running `database:migrate`.
- [x] Credential-free unit tests in `api/tests/unit/schema.test.ts` verify tables, enums, columns, indexes, primary keys, foreign keys, and relations, and API lint, format check, typecheck, build, and docs checks pass.
- [x] `agent-metadata.md` and `plan.md` record completion evidence after fresh-eyes review.

## Scope

In scope: `api/src/database/*`, `api/src/config/db.ts`, `api/drizzle.config.ts`, generated migration artifacts in `api/drizzle/`, `api/tests/unit/schema.test.ts`, `docs/work/drizzle-schema-sync/`, and `agent-metadata.md`.

Out of scope: executing `database:migrate` against a live database, implementing HTTP routes or services, or modifying `docs/database/schema.dbml`.
