# Express 5 API conventions

Use this page as the full reference for Express 5 work in `api/`. Routine module work uses the compact
rules in the `express-api` skill (`.agents/skills/express-api/SKILL.md`). Read this page in full only when changing
`api/src/app.ts`, `api/src/server.ts`, global middleware, global error handling, or when performing a
full `api/` pull-request review.

The [API outline](../api/api-design-outline.md) owns response envelopes, status codes, pagination,
and formatting. [Engineering conventions](engineering-conventions.md) owns cross-cutting API, data,
and security rules. [AI engineering rules](ai-engineering-rules.md) applies to LLM-backed features.
This page adds Express-specific mechanics and does not restate those owners.

## 1. Verified stack and golden blueprints

| Item | Verified state | Source |
| --- | --- | --- |
| HTTP & security | Express `^5.2.1`, `helmet`, `cors`, `cookie-parser`, `express-rate-limit` | [api/package.json](../../api/package.json) |
| Language and modules | TypeScript 7 ESM, `NodeNext`, `strict` (temp TS 6 compat dep) | [api/tsconfig.json](../../api/tsconfig.json) |
| Validation & OpenAPI | Zod `^4.6.5` (`z.toJSONSchema()` + `yaml` in `scripts/generate-openapi.ts`) | [api/package.json](../../api/package.json) |
| Auth & email | `argon2`, `jose`, `@sendgrid/mail` | [api/package.json](../../api/package.json) |
| Logging | Pino `^10.4.0`, `pino-http ^11.0.0` (with header/secret redaction) | [api/src/config/logger.ts](../../api/src/config/logger.ts) |
| Data | Drizzle ORM `^1.0.0-rc.4`, `pg ^8.23.1` | [api/package.json](../../api/package.json) |
| Tests | Vitest `^5.0.3`, Supertest `^7.3.1`, `@electric-sql/pglite` (in-memory Postgres) | [api/package.json](../../api/package.json) |

Before building a new module, read the live golden reference files instead of inventing structure:
- **Minimal CRUD + auth module:** `api/src/modules/workspaces/` (`routes`, `controller`, `service`, `repository`, `schemas`, `mapper`).
- **Multi-workflow + transaction module:** `api/src/modules/auth/` (`services/*.service.ts`, shared `services/auth-code.helper.ts`, `auth.constants.ts`).
- **Offline PostgreSQL test harness:** [api/tests/helpers/test-runtime.ts](../../api/tests/helpers/test-runtime.ts) (`createTestRuntime()` + `TRUNCATE ... CASCADE`).

## 2. Directory layout and layer boundaries

New features live under `api/src/modules/<feature>/`:

```text
api/src/
  app.ts                         pure Express app factory; no listen()
  routes.ts                      composes /api/v1 module routers (keeps server.ts focused)
  server.ts                      process bootstrap, readiness, listen(), shutdown
  config/                        loadEnv()/getConfig(), initDatabase()/getDb(), initLogger()/getLogger() (no import-time I/O)
  infra/                         internal platform clients (infisical, email, storage)
  database/                      Drizzle schema and relations
  errors/                        AppError hierarchy and normalization
  middleware/                    request id, validate, authenticate, rate-limit, error/404 handlers
  modules/<feature>/
    <feature>.routes.ts          method + path and middleware chain
    <feature>.controller.ts      HTTP mapping only
    <feature>.service.ts         business rules (or services/<workflow>.service.ts for multi-workflow modules)
    <feature>.repository.ts      Drizzle queries (single definition per query; optional tx)
    <feature>.schemas.ts         Zod request schemas
    <feature>.mapper.ts           row-to-DTO mapping
```

The request direction is `routes -> middleware -> controller -> service -> repository (Drizzle)`.
Dependencies point inward; a layer never imports its caller.

| Layer | Owns | Must not |
| --- | --- | --- |
| Routes | HTTP method, path, middleware order | Business rules or database access |
| Middleware | Validation, authentication, membership, request metadata | SQL or response-envelope policy beyond rejecting the request |
| Controller | Reading validated input, calling a service, status code, response envelope | Business rules, Drizzle, or `config/db` |
| Service | Business rules, tenant isolation, `AppError` translation, transaction boundary | Express types or HTTP status/response objects |
| Repository | Drizzle queries and persistence details | Express types, response shaping, or membership decisions |
| Mapper / DTO | Converting rows to API or service shapes | Database client access |

Machine-enforced boundaries live in [api/eslint.config.mjs](../../api/eslint.config.mjs):
services cannot import `express`, and controllers cannot import `drizzle-orm` or the database client.

Use relative ESM imports with the `.js` suffix in runtime source, matching the existing files. The
`@/*` alias is declared in `tsconfig.json` and used by tests, but `tsc` does not rewrite path aliases
in emitted JavaScript. Verify runtime resolution before using `@/*` in `api/src`.

### `app.ts` and `server.ts`

| File | Owns | Must not |
| --- | --- | --- |
| `app.ts` | A pure `createApp()` factory that composes global middleware and routers and returns the app | `listen()`, process signals, Infisical login, database readiness |
| `routes.ts` | Composing `/api/v1` module routers (auth, workspaces, future domains) so `server.ts` stays concise | Business rules, `listen()`, process signals |
| `server.ts` | Calling `loadEnv()`, `initLogger()`, `initDatabase()`, `initEmailSender()`, confirming DB readiness (`SELECT 1`), calling `listen()`, handling signals and fatal errors | Route definitions, business logic, test imports |

Tests import `createApp()` (never `server.ts`) after calling `initTestConfig()` or
`createTestRuntime()`, so unit and HTTP integration tests run offline without Infisical credentials.

### Repository transactions

Repositories accept an optional Drizzle executor defaulting to `getDb()` so services can pass a transaction without leaking transaction handling into HTTP code or wrapping repositories in classes:

```ts
import { getDb } from '../../config/db.js';
import type { DbExecutor } from '../../config/db.js';

export function findAgent(
  input: { workspaceId: number; agentId: number },
  tx: DbExecutor = getDb(),
) {
  return tx.query.agents.findFirst({
    where: (agents, { and, eq }) =>
      and(eq(agents.id, input.agentId), eq(agents.workspaceId, input.workspaceId)),
  });
}
```

Derive the transaction type once from the installed client. Do not hand-write Drizzle generics or
widen a transaction to `Database` to make a call type-check.

## 3. Express 5 mandatory rules and pitfalls

- **Async rejection forwarding is native.** Express 5 forwards a rejected promise returned by a
  route handler or middleware to the error handler. Do not add `asyncHandler`, `express-async-errors`,
  or a redundant `try/catch { next(err) }` in controllers. Catch only to translate a known domain
  failure into an `AppError`.
- **`req.query` is a read-only getter.** Never assign to `req.query`. Parse query input in validation
  middleware and store the parsed result in `res.locals.validated` (or an augmented `req.validated`).
  Controllers read that value, not the raw getter.
- **The query parser defaults to `'simple'`.** Do not switch to the extended parser. Nested query
  objects, duplicate-key arrays, and `?a[b]=c` shapes are not part of the contract; use flat
  parameters or a JSON body and parse repeated values explicitly.
- **`req.body` can be `undefined`.** It is undefined when no parser handled the request or the content
  type is not parsed; an empty parsed JSON body may be `{}`. Normalize with `req.body ?? {}` before
  schema validation.
- **Use `path-to-regexp` v8 syntax.** Wildcards must be named (`/*splat`, or `/{*splat}` to include
  the root). Optional segments use braces (`/users{/:id}`), not `:id?`. Inline regular expressions in
  route paths are unsupported; validate the parameter in middleware.
- **Mount the 404 middleware, do not use `app.all('*', ...)`.** After every router, call
  `app.use(notFoundMiddleware)`. A bare `*` path is invalid in Express 5.
- **Removed Express 4 APIs stay removed.** Do not use `req.param()`, `app.del()`,
  `res.redirect('back')`, `res.json(status, body)`, `res.send(status, body)`, or the body-first status
  signatures. Use `res.status(statusCode).json(body)` and `res.status(statusCode).send()`.
- **Status codes must be valid integers.** Express rejects non-integers and values outside the valid
  range. Use the shared constants or a named status, never a string or a computed float.
- **`req.host` includes the port; `req.hostname` does not.** Use `req.hostname` for host-only checks and
  `req.host` only when the authority, including its port, is the intended value.
- **`res.headersSent` is a hard guard.** If a response has started, do not write JSON again; delegate
  with `next(err)` and let Express close the connection.

Validation middleware stores parsed input; controllers read it via typed helpers instead of raw casts:

```ts
const { body, params } = getValidated<CreateWorkspaceInput, unknown, WorkspaceParamsInput>(res);
const { userId } = getAuthUser(res);
```

Do not add a global `Express.Request` augmentation for route-specific data.

## 4. Global middleware order in `api/src/app.ts`

The factory order is mandatory for the middleware the app installs. Each item exists to make a later
item safe; reordering changes security or observability behavior. Optional items are marked.

1. `app.set('trust proxy', ...)` using a validated value, not blanket `true`. Enable it only for the
   known proxy hop count or subnet.
2. Request ID middleware: accept a bounded, validated incoming `X-Request-Id` or generate a UUID;
   assign `req.id` and return it on the response. Reject or replace values that could inject log lines.
3. HTTP logger bound to `req.id`, so every request log and error log carries the same identifier.
4. `helmet()` for security headers.
5. Allowlisted CORS: origins come from validated configuration. Do not combine a wildcard origin with
   credentials.
6. Body limits: `express.json({ limit: '100kb' })`; add `express.urlencoded({ extended: false,
   limit: '100kb' })` only for endpoints that need form encoding.
7. Operational probes, when the deployment defines them: `GET /health` (liveness) and `GET /ready`
   (database readiness). The existing public product route remains `GET /api/v1/health`; root probes
   do not replace it and require an owning API/deployment docs update. Probes reveal no secrets,
   connection strings, or dependency details.
8. Surface-separated routers: Client API under `/api/v1`, and Backend internal and AI-service routes
   under `/internal` and `/webhooks/ai`. Do not mount an internal route in the client router. ADR-0004
   supersedes the earlier embedded-MCP design and targets Backend-owned tool execution; do not add an
   MCP mount unless a new authorized decision reverses that. If one is authorized, mount it separately
   from the client router.
9. `app.use(notFoundMiddleware)` after every router.
10. `app.use(errorHandlerMiddleware)` last. It must have four parameters so Express recognizes it as an
    error handler.

Implemented shape in [api/src/app.ts](../../api/src/app.ts) (add `/internal` and `/webhooks/ai` mounts here when implemented):

```ts
export function createApp(router: Router = clientRouter): Express {
  const config = getConfig();
  const logger = getLogger();
  const app = express();

  app.set('trust proxy', config.TRUST_PROXY);
  app.use(requestIdMiddleware);
  app.use(createHttpLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGINS, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1', router);
  // Mount /internal and /webhooks/ai separately when implemented.

  app.use(notFoundMiddleware);
  app.use(createErrorHandler(logger));

  return app;
}
```

The [API outline](../api/api-design-outline.md) currently defines only `GET /api/v1/health` as the
public health route. Root `/health` and `/ready` probes are operational, not a new client API surface;
if the deployment platform requires them, update the API outline, architecture, and README in the same
change and keep the product health route intact. The earlier embedded MCP mount is not part of this
shape; [ADR-0004](../adr/ADR-0004-backend-owned-tool-execution.md) supersedes it.

## 5. Global error handling

There is one error contract. Controllers and services throw `AppError` instances or an unrecognized
error; the single error handler normalizes the latter. Never send a different error shape from a
route, and never write an error response after calling the handler.

### `AppError` hierarchy

`AppError` carries an HTTP status, a stable `UPPER_SNAKE_CASE` code, a safe internal message, optional
details, and an operational flag:

```ts
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown[],
    readonly isOperational = true,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}
```

| Subclass | Status | Default code | Use |
| --- | --- | --- | --- |
| `BadRequestError` | `400` | `MALFORMED_REQUEST` | Unparseable syntax; semantic input errors use `422` |
| `UnauthorizedError` | `401` | `UNAUTHENTICATED` | Missing or invalid credential |
| `ForbiddenError` | `403` | `FORBIDDEN` | Authenticated without required access |
| `NotFoundError` | `404` | `NOT_FOUND` | Missing resource or non-member workspace |
| `ConflictError` | `409` | `CONFLICT` | Duplicate or invalid state transition; pass a resource-specific code |
| `UnprocessableEntityError` | `422` | `VALIDATION_ERROR` | Semantically invalid input or unavailable action |
| `TooManyRequestsError` | `429` | `RATE_LIMITED` | Route rate limit or resend/reset cooldown exceeded |

Each subclass shares the uniform `(message, code, details, options)` parameter order, sets its status
and default code, and passes overrides to `super`. The safe `message` is for server-side logs. The client envelope contains only `code` and optional
`details`, matching the [API outline](../api/api-design-outline.md). A resource that needs another code,
such as `DUPLICATE_NAME` or `ACTION_UNAVAILABLE`, passes it explicitly to the subclass. Services handling
specific SQLSTATE races (such as `23505` unique violations) reuse `extractPgCode` and `PG_ERROR_CODES`
from `src/errors/error-normalizer.ts`.

### Central normalization

The error handler maps expected failure classes before falling back to `INTERNAL_ERROR`:

| Source | Status | Code | Notes |
| --- | --- | --- | --- |
| `ZodError` | `422` | `VALIDATION_ERROR` | Details use `{ field, code, params? }` from `issues` |
| Body-parser `SyntaxError` (`entity.parse.failed`) | `400` | `MALFORMED_REQUEST` | Malformed JSON body |
| Body-parser `entity.too.large` | `413` | `PAYLOAD_TOO_LARGE` | Body limit exceeded |
| Malformed or invalid JWT (`jose`) | `401` | `UNAUTHENTICATED` | Normalized by `jose` error name in `error-normalizer.ts` |
| Expired access token | `401` | `UNAUTHENTICATED` | Re-authenticate or refresh |
| Expired or invalid refresh session | `401` | `SESSION_EXPIRED` | Auth refresh flow owns the decision |
| PostgreSQL `23505` | `409` | resource-specific or `CONFLICT` | Duplicate key; prefer a deliberate field-level code |
| PostgreSQL `23503` | `422` or `409` | `VALIDATION_ERROR` or resource-specific | Missing reference is `422`; delete blocked by dependants is `409` |
| PostgreSQL `22P02` / `22003` | `422` | `VALIDATION_ERROR` | Invalid representation or numeric out-of-range (e.g., `int4` overflow) |
| PostgreSQL `23514` | `422` | `VALIDATION_ERROR` | Check constraint violation |
| PostgreSQL `40001` / `40P01` | `503` | `UPSTREAM_UNAVAILABLE` | Retry serialization/deadlock at the transaction boundary, then report storage unavailable with `details: [{ service: "storage" }]` |
| Unknown error | `500` | `INTERNAL_ERROR` | `isOperational = false`; alert on these |

The API outline reserves `400 MALFORMED_REQUEST` for unparseable request syntax. Client-caused database
constraint and representation failures are semantic input errors, so they map to `422` or a
resource-specific `409`, not `400`.

Map SQLSTATE from the `pg` error `code`, not from message text. Repositories let database errors
propagate; the global normalizer owns the status mapping. If a route needs a resource-specific code,
translate at the service boundary into `ConflictError` or another `AppError`.

### Handler behavior

- If `res.headersSent`, call `next(err)` immediately and do not write a body.
- Log `4xx` at `warn` or `info`; log `5xx` at `error`. Include request ID, status, code, method, and
  route. Do not log request bodies, cookies, authorization headers, provider tokens, or raw SQL.
- Return the shared envelope. Never return an error message, stack trace, SQL statement, constraint
  name, or connection detail to the client. Production logs also omit stack traces and raw SQL.
- Keep `isOperational` out of the response. It controls alerting and whether the error is expected.
- One handler only. Do not add feature-local error middleware that writes a different shape.

## 6. Responses and OpenAPI sync

The [API outline](../api/api-design-outline.md) owns the envelopes, status codes, pagination metadata,
detail shapes, and casing. Match its `{ data }`, paginated `{ data, meta }`, and
`{ error: { code, details? } }` shapes and its `200`/`201`/`202`/`204`, `4xx`, and `429` statuses
exactly; do not redefine them here.

Express-specific mechanics:

- Use `res.status(statusCode).json(...)`; send `204` with no body.
- Never use the removed status-first or body-first `res.send`/`res.json` signatures.
- Do not return raw Drizzle rows, database column names, password hashes, encrypted credentials, or
  provider tokens. Map rows to camelCase client DTOs at the module boundary; AI Service payloads follow
  the [AI Service contract](../ai-service-integration/ai-service-contract.md).
- Keep generated specs synchronized: client routes belong in
  [openapi.client.yaml](../api/openapi.client.yaml) (generated from Zod 4 schemas via
  `npm run openapi:generate --prefix api` and checked with `npm run openapi:check --prefix api`);
  internal and AI-webhook routes belong in
  [openapi.internal.yaml](../api/openapi.internal.yaml). ADR-0004 supersedes the embedded MCP surface;
  do not document MCP routes unless a new decision restores it.

### OpenAPI generation flow (frontend-ready contract)

Never hand-edit `docs/api/openapi.client.yaml` (or `openapi.internal.yaml`). When adding or modifying
any route or Zod schema:

1. **Register the operation in `api/scripts/generate-openapi.ts`** (and mirror the same pattern for
   `openapi.internal.yaml` once `/internal` or `/webhooks/ai` routes are implemented).
2. **Import the live Zod 4 schemas** via `zodToOpenApiSchema(...)` so field types, string bounds,
   patterns, and required keys never drift from runtime validation.
3. **Make every endpoint frontend- and Apidog-ready** (`docs/api/openapi.client.yaml` is imported
   into **Apidog** for frontend/QA testing and contract sync):
   - Assign a resource-grouped tag (`Auth`, `Workspaces`, `Agents`, etc. — maps to Apidog folders),
     a concise `summary` (sidebar title), and a **stable** camelCase `operationId` (never rename an
     existing `operationId` casually, as Apidog uses it to match endpoints on re-import).
   - Keep a valid full dev URL in `servers` (e.g., `http://localhost:3000/api/v1`) so requests work
     out of the box in Apidog.
   - Declare exact `security` (`userAccessToken`, `refreshToken`, or public) plus path/query params
     and response headers (such as `Set-Cookie`).
   - Include complete, realistic request and response `example` payloads for every `200`/`201`
     response, and clear descriptions for `202`/`204` responses.
   - Attach reusable common error responses (`400`, `401`, `413`, `422`, `500`, `429`), **and** add
     named `examples` for every workflow-specific `error.code` (e.g., `EMAIL_ALREADY_EXISTS`,
     `EMAIL_NOT_VERIFIED`, `INVALID_RESET_CODE`, `NOT_FOUND` resource details — rendered as named
     response tabs in Apidog).
   - Keep `components.schemas` error-detail enums up to date (`ValidationDetail.code` lists every
     `details[].code` emitted by `error-normalizer.ts`, `NotFoundDetail.resource` lists every
     `NOT_FOUND` resource) and use `VALIDATION_ERROR` (not custom root codes) for Zod field rules.
4. **Regenerate and verify zero drift:** run `npm run openapi:generate --prefix api` followed by
   `npm run openapi:check --prefix api` before committing.

## 7. Validation, configuration, logging, tenancy, and Drizzle

### Request validation

Validate `body`, `query`, and `params` in middleware with Zod, then pass typed data downstream.
Normalize `req.body ?? {}` first. Use strict object schemas for JSON bodies, coerce path and query
numbers explicitly, and bound string lengths. Reject unknown query shapes instead of silently
accepting them. A validation failure throws `UnprocessableEntityError` with `VALIDATION_ERROR` details.

### Configuration and Infisical

Read runtime configuration only through [api/src/config/env.ts](../../api/src/config/env.ts) (`loadEnv()` called at startup in `server.ts`; no top-level `await` at import time). ESLint
forbids `process.env` in `api/src/**`; the only exemptions are the bootstrap files `config/env.ts` and
`infra/infisical/fetch-secrets.ts`. Add new runtime variables to the Zod schema and the
Infisical environment; add only bootstrap variables to `api/.env.example`. Fail fast at startup when a
required variable is missing. Infisical holds runtime values; `NODE_ENV` and the `INFISICAL_*`
bootstrap credentials are the only values read directly from `process.env` in `api/src`. Never log,
return, or document secret values.

### Logging and redaction

Use the shared Pino logger, never `console` in `api/src` (the server entry point has a bootstrap
exception). Bind request logs to `req.id`. Configure redaction for `authorization`, `cookie`,
`set-cookie`, password fields, tokens, refresh tokens, and provider credentials. Do not log request
bodies by default. HTTP logs include method, route, status, duration, and request ID, not query
strings that may contain sensitive values.

### Multi-tenant isolation

The security rules are owned by [engineering conventions](engineering-conventions.md#security-and-credentials);
the Express mechanics below apply them. Every workspace resource query includes `workspaceId` in the
lookup, including updates and deletes:

```ts
where: (agents, { and, eq }) =>
  and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId))
```

Derive `workspaceId` from the route and authenticated membership, never from an untrusted body field.
A non-member receives `404 NOT_FOUND`, not a resource existence signal. Services enforce membership
before repository calls; repositories do not decide authorization. Internal AI-service calls use the
internal identity token and the workspace context in the validated request, not a client-supplied
tenant override.

### Drizzle and DTOs

Use parameterized Drizzle query builders. `sql` template literals are allowed only for trusted
fragments, never for interpolated user input. Services own `db.transaction`; pass the inferred
transaction executor to every repository in the unit of work. Do not make network calls inside a
database transaction. Use idempotency keys for externally visible actions. Return DTOs, not table
rows, and map database `created_at`/`updated_at` to `createdAt`/`updatedAt` ISO 8601 UTC strings at
the API boundary.

## 8. Graceful shutdown and readiness

Only [api/src/server.ts](../../api/src/server.ts) owns process lifecycle:

1. Import validated configuration and confirm database readiness before accepting traffic.
2. Call `listen()` and log the bound port through the shared logger.
3. On `SIGTERM` or `SIGINT`, stop accepting connections, close idle keep-alive connections, close the
   PostgreSQL pool, and exit. Make shutdown idempotent and bound it with a timeout that force-exits.
4. On `unhandledRejection` or `uncaughtException`, log at fatal level and exit non-zero. Do not keep
   serving after an uncaught exception.
5. If operational probes are defined, expose `/ready` with a short database check and keep `/health`
   independent of the database; the product health route remains `/api/v1/health`.

[api/src/server.ts](../../api/src/server.ts) implements startup `SELECT 1` readiness, idempotent
`SIGTERM`/`SIGINT` shutdown (`server.closeIdleConnections()` + `closeDatabase()`), and fatal
handlers. Always test `createApp()` without starting a listener.

## 9. Testing

- **Unit & service tests (Vitest + PGlite):** test validation schemas, DTO mappers, error normalization, crypto utilities, and services directly against real in-memory PostgreSQL via `createTestRuntime()` in `api/tests/helpers/test-runtime.ts` (`@electric-sql/pglite` + real Drizzle migrations, resetting with `TRUNCATE ... CASCADE` in `beforeEach`). Do not write fake `InMemory*Repository` clones.
- **Integration tests (Supertest):** import `createApp()` and send requests without `listen()`. Cover success envelopes, `201`/`204`/`202`, malformed JSON, `413`, validation `422`, `401`/`403`/`404`, `429`, and an unexpected `500` that does not leak a stack or SQL.
- **No Infisical credentials required for tests:** `initTestConfig()` and `createTestRuntime()` initialize test config, silent Pino logger, PGlite database, and `FakeEmailSender` so the entire `npm test --prefix api` suite runs offline and fast.

## 10. Enforcement and review checklist

Mechanical rules are enforced by ESLint in [api/eslint.config.mjs](../../api/eslint.config.mjs) (run with
`npm --prefix api run lint`): no `console` in `api/src` (except the `server.ts` startup log), no `process.env`
outside the two bootstrap files, services never import `express`, and controllers never import
`drizzle-orm` or the database client. Do not restate or bypass them.

Before review, confirm:

- The route is mounted on the correct surface and appears in the matching OpenAPI target.
- The controller contains no business rule, Drizzle import, or database client import.
- The service owns membership, `workspaceId` scoping, transactions, and `AppError` translation.
- The service does not import Express or use `req`/`res`.
- Async handlers rely on native rejection forwarding; there is no `asyncHandler` or redundant
  `next(err)` catch.
- Query, body, and param input are read via `getValidated(res)` (never reassign `req.query`), and auth context via `getAuthUser(res)`.
- Routes, controllers, services, and repositories are plain exported functions with zero `deps` threading or repository wrapper classes.
- Every error path produces the shared `{ error: { code, details? } }` envelope and the correct status.
- Logs contain request ID, status, and code, but no secrets, request bodies, or raw SQL.
- Tests run against PGlite (`createTestRuntime()`) rather than fake repositories, and `npm run openapi:check --prefix api` passes.

When a rule changes, update `api/eslint.config.mjs`, this page, and the `express-api` skill in the
same change.
