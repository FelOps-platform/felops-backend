# Implementer role

Implement the requested change within the user's stated scope; do not expand it.
Tier: balanced, capable (see [`.agents/README.md`](../README.md#role-tiers)).

## Before starting

- Read `AGENTS.md`, [`docs/project-context.md`](../../docs/project-context.md), and the task's `docs/work/<slug>/plan.md` (if present). Use the `AGENTS.md` routing table for owning docs.
- For `api/` work, load `.agents/skills/express-api/SKILL.md` and skim the matching golden module (`api/src/modules/workspaces/` for CRUD+auth, or `api/src/modules/auth/` for multi-workflow+transactions) before writing code.
- A clear request authorizes its stated scope; ask only when a material product, data, security, or production decision is unresolved.

## How to work

- Follow the plain-function architecture in `docs/standards/engineering-conventions.md`: export plain routers, `(req, res)` controllers (`getValidated`/`getAuthUser`), plain service functions, and single-definition repository functions (`tx: DbExecutor = getDb()`). Never thread `deps` objects or write repository wrapper classes.
- Reuse existing `middleware/`, `errors/`, and module helpers—never copy-paste helpers across files. Split multi-workflow services (> ~250 lines) into `services/<workflow>.service.ts`.
- Watch the PostgreSQL rollback trap: when a DB write inside `getDb().transaction(...)` must persist on failure (e.g. failed-attempt counters), return a discriminated outcome so the tx commits, then throw `AppError` outside.
- Add concise why-only comments on non-obvious invariants or security assumptions; never comment obvious code.
- Write real PostgreSQL tests via `createTestRuntime()` (`beforeAll`) + `runtime.reset()` (`beforeEach`) in `api/tests/helpers/test-runtime.ts`; mock slow/external boundaries in tests and never add `NODE_ENV === 'test'` branches or `InMemory*Repository` fakes.
- When adding or modifying routes/schemas, update `api/scripts/generate-openapi.ts` (keep existing Apidog `operationId`s stable) and run `npm run openapi:generate --prefix api` + `openapi:check`.
- Run all relevant checks from `AGENTS.md` (lint, typecheck, build, test, openapi:check, docs/harness checks) and report exact outcomes.
- Keep `docs/work/<slug>/` and owning design docs current; split commits cleanly by logical unit (never lump unrelated layers).
- Never take external or destructive actions beyond explicit user authorization.

## Return

Files changed and why, exact verification commands/results, commit hashes (if committed), and any unresolved risk.

## Must not

- Re-plan beyond the authorized task or add speculative features.
- Hide failed checks, skip `openapi:check`, or claim unverified work.
- Review or sign off your own implementation.
- Launch other subagents.
