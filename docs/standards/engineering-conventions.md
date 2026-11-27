# Engineering conventions

These are the cross-cutting rules for Backend API and data work. The
[API outline](../api/api-design-outline.md) owns concrete envelopes, status codes, pagination, and
formatting; [schema.dbml](../database/schema.dbml) owns the data model. This page owns rules that
neither states in full and resolves conflicts between them.

Use these conventions when designing, planning, or implementing a Backend change; link here or to the
owning section instead of restating them.

## API behavior

- **Idempotent by default.** Use `PUT` for create or replace at a known ID and `POST` only when
  the server assigns the ID.
- **Hard delete by default.** Archive or soft delete needs an explicit decision recorded in the
  owning document or an ADR.
- **Derive, do not store.** Computed values such as action availability are calculated from
  registry membership, connection status, and workspace setting.
- **Do not key collections by ID.** Return arrays of groups that carry their own ID and label.
- **Fixed sets use enums; open labels use strings.** Adding an enum value needs a migration.
- **UTC everywhere.** Use ISO 8601 timestamps in API payloads.

The [API outline](../api/api-design-outline.md) sections 3 and 4 own naming, envelopes, pagination,
status codes, and error details. Follow them rather than copying them.

### Constants & Magic Values

- Extract non-obvious domain or protocol literals (TTLs, OTP lengths, retry/rate limits, pagination bounds, header/cookie names, error codes) into named `UPPER_SNAKE_CASE` constants or `as const` objects (prefer `as const` over TS `enum`).
- **Colocate by default**: Place feature-specific constants in `api/src/modules/<feature>/<feature>.constants.ts`; use `api/src/shared/constants.ts` only for truly cross-cutting app constants. Never create a single catch-all global constants file.
- **Env vs. Constants**: Values that vary by environment or ops config belong in `api/src/config/env.ts`, not `*.constants.ts`.
- **No pointless extraction**: Do not extract trivial literals (`0`, `1`, `''`), standard HTTP status codes, or obvious single-use values.

### Dependencies & Standard Libraries

- **Check Node built-ins and `api/package.json` first**: Before writing a utility or installing a package, check Node.js built-ins (`node:crypto`, `fetch`, `AbortSignal.timeout`, `structuredClone`, `URL`) and existing dependencies in `api/package.json`.
- **Never hand-roll security, protocol, or parsing primitives**: Always use established, maintained libraries for cryptography, password hashing, JWT/OAuth handling, rate limiting, schema validation, and non-trivial parsing or timezone math.
- **No packages for trivial helpers**: Do not install a dependency for a small, self-contained pure function (under ~15–20 lines) or add a package that overlaps with an already-installed library.
- **Justify new dependencies**: Only add a new package to `api/package.json` when the problem warrants a library, the package is actively maintained with native TypeScript types, and no existing dependency already covers it.

### Functions vs. Classes

- **Default to plain exported functions with zero `deps` threading**: Write routes (`export const <feature>Router = Router()`), controllers (`(req, res)`), services, repositories (`tx: DbExecutor = getDb()`), middleware, and utilities as plain named exported functions. Initialize runtime singletons once at startup (`loadEnv()`/`getConfig()`, `initDatabase()`/`getDb()`, `initLogger()`/`getLogger()`). Do **not** wrap routers, controllers, services, or repositories in `createX(deps)` factories or thread a `deps` object through layers.
- **Reserve classes for `Error` hierarchies**: Use classes only for `AppError` subclasses; write plain exported functions everywhere else. Never write stateless controller, service, or repository classes, and never pass class methods unbound as callbacks.

### Readability & Maintainability

- **Object params for multi-arg or same-type inputs**: Any function taking more than 3 parameters—or 2+ adjacent parameters of the same primitive type (e.g., `workspaceId: string, agentId: string`)—must accept a single typed object parameter (`{ workspaceId, agentId }`) to prevent silent argument swaps.
- **Explicit data-access naming contract**:
  - `findX(...)` returns `X | null` (absence is valid).
  - `getX(...)` returns `X` or throws `NotFoundError` (never returns `null`).
  - `assertX(...)` returns `void` or throws a domain `AppError`.
  - Prefix booleans with `is`, `has`, `can`, or `should`.
- **Flat control flow**: Prefer early returns and guard clauses at the top of functions; keep nesting to at most 2–3 levels and avoid deep `if/else` blocks.
- **Cohesive functions & zero copy-paste duplication**: Split functions that mix orchestration with low-level mapping or exceed ~50 lines, and split multi-workflow services (> ~250 lines) into `modules/<feature>/services/<workflow>.service.ts`. Before writing a helper, query, or guard, check `middleware/`, `errors/`, and existing module helpers—never duplicate the same logic (e.g. `getAuthUser`, `getValidated`, OTP issuance/verification) across files. Extract shared cross-module abstractions once a pattern repeats across modules, and extract shared intra-module helpers as soon as two workflows share security-critical logic.
- **No test-conditioned code in `api/src/`**: Never branch on `NODE_ENV === 'test'`, define `TEST_*` constants, or add test-only bypass flags in production source. Keep production code environment-agnostic; explicit dependency-injection and reset seams used by bootstrap/tests (such as `initConfig`, `setDatabase`, and `clearAuthStores`) are allowed. Mock slow/external boundaries (such as Argon2id or EmailJS) inside `api/tests/` via `vi.mock`.
- **No duplicate repository wrappers, fake repositories, or import-time I/O**: Define each repository query once as a plain exported function accepting `tx: DbExecutor = getDb()` (never duplicate queries as both standalone functions and class methods). Never execute network/DB I/O at module import time (no top-level `await` in `config/env.ts` or eager `new Pool(...)` in `config/db.ts`). Never write `InMemory*Repository` test clones—use `api/tests/helpers/test-runtime.ts` (`@electric-sql/pglite` + real Drizzle migrations) so tests execute real PostgreSQL SQL, constraints, and transactions.
- **Transaction boundaries & rollback awareness**: Never throw inside `getDb().transaction(...)` when a write inside that transaction (such as incrementing failed OTP attempts) must persist—return a discriminated outcome so PostgreSQL commits the write, then throw `AppError` outside. Keep CPU-heavy work (Argon2id hashing) and external I/O (email, HTTP calls) outside DB transactions so connections and row locks are released quickly.
- **Schema-inferred types, shared PG error inspection, & bounded caches**: Derive repository row types from Drizzle (`typeof table.$inferSelect`) instead of hand-copying column interfaces that drift from `api/src/database/`. Inspect PostgreSQL SQLSTATE codes via `extractPgCode` and `PG_ERROR_CODES` in `src/errors/error-normalizer.ts` rather than writing local error-shape checks. Always cap in-memory `Map` stores with a max-entry limit and expiry pruning so untrusted input cannot grow memory unbounded.
- **Platform `infra/` vs. product `integrations/`**: Place internal infrastructure clients (`infisical`, transactional `email`, storage) under `api/src/infra/`; reserve `modules/integrations/` strictly for customer-connected FelOps integrations.
- **Avoid micro-files & unsafe `res.locals` casts**: Do not create 3–5 line constant or middleware files that just add file-hopping; colocate tiny module-local literals in their schema/mapper until a module needs a real constants file. Read validated input and auth context through typed helpers (`getValidated(res)`, `getAuthUser(res)`) rather than repeating `as` casts in controllers.
- **Top-down file order & explicit boundary types**: Order files as imports → types/schemas → exported public functions → private helpers. Declare explicit return types on exported service, repository, and shared functions; rely on inference for local variables.
- **Why-only comments & zero dead code**: Never comment what code literally does. Reserve comments for non-obvious invariants, security assumptions, workarounds, or ADR references. Delete unused exports and commented-out code immediately.

### Quick Do / Don't (copy live blueprints)

Before creating a new module, read the live blueprints: `api/src/modules/workspaces/` (minimal CRUD + bearer auth), `api/src/modules/auth/` (multi-workflow services + transactions), and `api/tests/helpers/test-runtime.ts` (PGlite setup).

| Area | Do | Don't |
| --- | --- | --- |
| Layers & wiring | Export plain `myRouter`, `(req, res)` handlers, plain service functions, and `findX(input, tx = getDb())` | Wrap routers/controllers/services in `createX(deps)` or thread `deps` through layers |
| Repositories | Define each Drizzle query once as a plain exported function; infer row types via `typeof table.$inferSelect` | Duplicate queries across functions and classes, or hand-copy column interfaces |
| Transactions | Return `{ isValid: false }` when a write must commit, then throw outside; keep hashing and external I/O outside `transaction(...)` | Throw inside `transaction(...)` after a write that must survive, or run Argon2id/email inside a tx |
| Errors & stores | Use uniform `AppError` subclass `(message, code, details)` order, `extractPgCode`/`PG_ERROR_CODES`, and bounded in-memory `Map`s | Hand-roll `(err as { code?: string })` checks or leave module-level `Map` caches unbounded |
| Controllers | Read inputs via `getValidated(res)` and `getAuthUser(res)` | Repeat `res.locals.X as ...` casts or import Drizzle/`config/db` |
| Constants | Colocate in `<feature>.constants.ts` (or inline 1–2 literals in schema/mapper) | Create a 3-line constants file or a catch-all global constants dump |
| Tests | Run real SQL + migrations on PGlite via `createTestRuntime()` in `beforeAll` + `runtime.reset()` in `beforeEach`; mock slow/external boundaries in `api/tests/` | Build `InMemory*Repository` fake DB clones, boot new PGlite per test, or add `NODE_ENV === 'test'` branches in `api/src/` |

## Data naming and types

- Plural table names; link tables join two plural entities.
- `id int [pk, increment]`; foreign keys use `<entity>_id`; stable slugs use `*_key`.
- Enums use `<domain>_<property>` with lowercase `snake_case` values, except HTTP method values
  such as `GET`.
- Add `created_at` where creation time matters and `updated_at` on editable rows.
- Entity state uses `is_*` (for example, `is_verified`). Use `varchar(n)` for bounded text, `text`
  for long content, and `varchar(2048)` for URLs.
- Hard deletes cascade through foreign keys. For workspace knowledge, request vector purge before
  deleting the source. A failed purge keeps the source and assignments for retry; a successful
  purge removes the source, assignments, metadata, and private object.
- Internal services get distinct sub-resources when they need a different representation.

[schema.dbml](../database/schema.dbml) owns the tables, columns, enums, and relationships.

## Security and credentials

- Encrypt secrets at rest; never store credentials in plaintext.
- Provider credentials never leave the Backend. Tokens never appear in frontend URLs, browser
  storage, or logs.
- Hash passwords with Argon2id; never store or log plaintext credentials.
- Keep access tokens short-lived; store refresh tokens and auth codes as hashes; rotate refresh
  tokens; revoke sessions on sign-out and password reset.
- Use generic responses for sign-up, password reset, and resend to avoid enumeration; rate-limit
  these flows.
- Workspace resources for non-members return `404 NOT_FOUND`; `403 FORBIDDEN` is for role
  restrictions when membership is modeled.
- The AI Service calls the Backend API; it does not write PostgreSQL directly.

The [authentication design](../features/auth.md) owns the auth workflows and token rules. The
[architecture](../architecture.md) and
[AI Service contract](../ai-service-integration/ai-service-contract.md) own the service
boundaries.

## Localization

The frontend owns static labels, descriptions, and category labels for integrations, actions, and
channel types. The Backend sends stable keys and user-owned text only. LLM-facing action
descriptions are not used for display. Unknown keys fall back to the key plus an update-required
state, without hiding rows or removing existing grants.

See the [API outline](../api/api-design-outline.md) for the response rules.

## Documentation and maintenance

Feature pages, API references, and schema changes follow the
[documentation conventions](document-conventions.md); record durable decisions in [docs/adr](../adr/README.md).
When a rule changes, update the owning document first; do not add a second copy to a skill, brief, or
feature page.

### Commit Hygiene

- **Split multi-concern work into cohesive, checked commits.** Do not lump documentation, shared framework/middleware scaffolding, external integrations, and multiple feature modules into a single monolithic commit.
- Group each commit around one logical layer or concern (for example: design/convention docs → shared API foundation → integration adapter → feature module + tests → work-doc/context updates), keeping every commit passing its relevant checks.
- Stage only the paths belonging to that unit; never commit plan-only work or failing code.
