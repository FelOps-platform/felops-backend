# Express 5 API conventions

Use this page as the full reference for Express 5 work in `api/`. Routine module work uses the compact
rules in the `express-api` skill (`.agents/skills/express-api/SKILL.md`). Read this page in full only when changing
`api/src/app.ts`, `api/src/server.ts`, global middleware, global error handling, or when performing a
full `api/` pull-request review.

The [API outline](../api/api-design-outline.md) owns response envelopes, status codes, pagination,
and formatting. [Engineering conventions](engineering-conventions.md) owns cross-cutting API, data,
and security rules. [AI engineering rules](ai-engineering-rules.md) applies to LLM-backed features.
This page adds Express-specific mechanics and does not restate those owners.

## 1. Verified stack and current scaffold

| Item | Verified state | Source |
| --- | --- | --- |
| HTTP framework | Express `^5.2.1`; `@types/express ^5.0.6` | [api/package.json](../../api/package.json) |
| Language and modules | TypeScript ESM, `NodeNext`, `strict` | [api/tsconfig.json](../../api/tsconfig.json) |
| Validation | Zod `^4.6.5` | [api/package.json](../../api/package.json) |
| Logging | Pino `^10.4.0`, pino-http `^11.0.0` | [api/package.json](../../api/package.json) |
| Data | Drizzle ORM `^1.0.0-rc.4`, `pg ^8.23.1` | [api/package.json](../../api/package.json) |
| Tests | Vitest `^5.0.3`, Supertest `^7.3.1` | [api/package.json](../../api/package.json) |

The current executable scaffold is deliberately small. [api/src/app.ts](../../api/src/app.ts) creates
the app at module load, installs `express.json()` and the HTTP logger, and serves
`GET /api/v1/health`. [api/src/server.ts](../../api/src/server.ts) calls `listen()` and logs with
`console.log`. There are no module folders, request-id, Helmet, CORS, readiness route, `AppError`
hierarchy, or global error handlers yet. `helmet`, `cors`, and a request-id package are not installed
dependencies.

The conventions below are the required target for new API code and for the next change to the app or
server entry points. Do not describe an unimplemented piece as current behavior. Add missing
dependencies only in an implementation change that uses them.

## 2. Directory layout and layer boundaries

New features live under `api/src/modules/<feature>/`:

```text
api/src/
  app.ts                         pure Express app factory; no listen()
  server.ts                      process bootstrap, readiness, listen(), shutdown
  config/                        env, logger, database client
  errors/                        AppError hierarchy and normalization
  middleware/                    request id, not-found, global error handler
  modules/<feature>/
    <feature>.routes.ts          method + path and middleware chain
    <feature>.controller.ts      HTTP mapping only
    <feature>.service.ts         business rules, authorization, transactions
    <feature>.repository.ts      Drizzle queries, optional tx
    <feature>.schemas.ts         Zod request schemas
    <feature>.mapper.ts           row-to-DTO mapping
    middleware/                  feature-specific auth or tenancy checks
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
| `app.ts` | A pure `createApp()` factory that composes middleware and routers and returns the app | `listen()`, process signals, Infisical login, database readiness |
| `server.ts` | Importing validated config, confirming database readiness, calling `listen()`, handling signals and fatal process errors | Route definitions, business logic, test imports |

Tests import the factory, never the listening server. Keep a default `app` export only if existing
tests need it; prefer an explicit `createApp()` with injectable dependencies so tests do not require
Infisical bootstrap credentials.

### Repository transactions

Repositories accept an optional Drizzle executor so services can pass a transaction without leaking
transaction handling into HTTP code:

```ts
import db from '../../config/db.js';
import type { Database } from '../../config/db.js';

export type DbTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DbExecutor = Database | DbTransaction;

export function findAgent(workspaceId: number, agentId: number, tx: DbExecutor = db) {
  return tx.query.agents.findFirst({
    where: (agents, { and, eq }) =>
      and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)),
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

Validation middleware stores parsed input; it does not mutate the request:

```ts
res.locals.validated = { body: parsedBody, query: parsedQuery, params: parsedParams };
```

A controller that needs a typed local can use `Response<unknown, { validated: ValidatedRequest }>`.
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

Target shape:

```ts
export function createApp(deps: AppDependencies = defaultDependencies) {
  const app = express();

  app.set('trust proxy', deps.config.TRUST_PROXY);
  app.use(requestId);
  app.use(httpLogger);
  app.use(helmet());
  app.use(cors({ origin: deps.config.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/v1/health', healthHandler);

  // Add root liveness/readiness probes only when the owning API and deployment
  // docs define them; they are not part of the client API contract.
  // app.get('/health', livenessHandler);
  // app.get('/ready', readinessHandler);

  app.use('/api/v1', clientRouter);
  app.use('/internal', internalRouter);
  app.use('/webhooks/ai', aiWebhookRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
```

The [API outline](../api/api-design-outline.md) currently defines only `GET /api/v1/health` as the
public health route. Root `/health` and `/ready` probes are operational, not a new client API surface;
if the deployment platform requires them, update the API outline, architecture, and README in the same
change and keep the product health route intact. The earlier embedded MCP mount is not part of this
shape; [ADR-0004](../adr/ADR-0004-backend-owned-tool-execution.md) supersedes it.

The current [api/src/app.ts](../../api/src/app.ts) implements only JSON parsing, the HTTP logger, and
the health route. Migrate it to the full order when that file is next changed; do not copy the target
shape into code that still lacks the dependencies.

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

Each subclass sets its status and default code, then passes any resource-specific code, details, or
cause to `super`. The safe `message` is for server-side logs. The client envelope contains only `code` and optional
`details`, matching the [API outline](../api/api-design-outline.md). A resource that needs another code,
such as `DUPLICATE_NAME` or `ACTION_UNAVAILABLE`, passes it explicitly to the subclass.

### Central normalization

The error handler maps expected failure classes before falling back to `INTERNAL_ERROR`:

| Source | Status | Code | Notes |
| --- | --- | --- | --- |
| `ZodError` | `422` | `VALIDATION_ERROR` | Details use `{ field, code, params? }` from `issues` |
| Body-parser `SyntaxError` (`entity.parse.failed`) | `400` | `MALFORMED_REQUEST` | Malformed JSON body |
| Body-parser `entity.too.large` | `413` | `PAYLOAD_TOO_LARGE` | Body limit exceeded |
| Malformed or invalid JWT | `401` | `UNAUTHENTICATED` | Normalize by error name; auth package is not installed yet |
| Expired access token | `401` | `UNAUTHENTICATED` | Re-authenticate or refresh |
| Expired or invalid refresh session | `401` | `SESSION_EXPIRED` | Auth refresh flow owns the decision |
| PostgreSQL `23505` | `409` | resource-specific or `CONFLICT` | Duplicate key; prefer a deliberate field-level code |
| PostgreSQL `23503` | `422` or `409` | `VALIDATION_ERROR` or resource-specific | Missing reference is `422`; delete blocked by dependants is `409` |
| PostgreSQL `22P02` | `422` | `VALIDATION_ERROR` | Invalid path, query, or body representation |
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
  [openapi.client.yaml](../api/openapi.client.yaml); internal and AI-webhook routes belong in
  [openapi.internal.yaml](../api/openapi.internal.yaml). ADR-0004 supersedes the embedded MCP surface;
  do not document MCP routes unless a new decision restores it. Update the operation, schemas, response
  envelopes, and common errors in the same change, then validate both specifications.

## 7. Validation, configuration, logging, tenancy, and Drizzle

### Request validation

Validate `body`, `query`, and `params` in middleware with Zod, then pass typed data downstream.
Normalize `req.body ?? {}` first. Use strict object schemas for JSON bodies, coerce path and query
numbers explicitly, and bound string lengths. Reject unknown query shapes instead of silently
accepting them. A validation failure throws `UnprocessableEntityError` with `VALIDATION_ERROR` details.

### Configuration and Infisical

Read runtime configuration only through [api/src/config/env.ts](../../api/src/config/env.ts). ESLint
forbids `process.env` in `api/src/**`; the only exemptions are the bootstrap files `config/env.ts` and
`integrations/infisical/fetch-secrets.ts`. Add new runtime variables to the Zod schema and the
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

The current server calls `listen()` only and has no readiness or shutdown handling. Add those pieces
when the server is next changed, and test the factory without starting a listener.

## 9. Testing

- **Unit tests (Vitest):** services with fake repositories, validation schemas, DTO mappers, and error
  normalization. Assert the `AppError` code/status/details, not implementation details.
- **Integration tests (Supertest):** import `createApp()` and send requests without `listen()`. Cover
  success envelopes, `201`/`204`/`202`, malformed JSON, validation `422`, `404`, `409`, `429`, and an
  unexpected `500` that does not leak a stack or SQL. Inject config and database fakes so unit and
  most integration tests do not need Infisical.
- **Database integration tests:** use an isolated test database or roll back transactions. Never point
  tests at a shared production database. Test workspace scoping with a non-member request.
- **Current limitation:** the existing health test imports the app, which imports Infisical
  configuration. Keep that limitation explicit until `createApp()` accepts injectable dependencies.

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
- Query input is read from `res.locals.validated`, not reassigned onto `req.query`.
- Every error path produces the shared `{ error: { code, details? } }` envelope and the correct status.
- Logs contain request ID, status, and code, but no secrets, request bodies, or raw SQL.
- Tests exercise behavior and the error envelope, not only the happy path.

When a rule changes, update `api/eslint.config.mjs`, this page, and the `express-api` skill in the
same change.
