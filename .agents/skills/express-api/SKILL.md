---
name: express-api
description: Compact Express 5 conventions. Use when adding or changing routes, middleware, controllers, services, repositories, validation, or error handling under api/.
---

# Express 5 API work

- **Golden blueprints (copy these patterns):** `api/src/modules/workspaces/` (minimal CRUD + auth), `api/src/modules/auth/` (multi-workflow `services/*.service.ts` + transactions), `api/tests/helpers/test-runtime.ts` (PGlite setup).
- **Layers:** routes → middleware → controller → service → repository (Drizzle). Export plain routers, `(req, res)` controllers, plain service functions, and plain repository functions (`tx: DbExecutor = getDb()`)—no manual `deps` threading, router factories, or repository classes.
- **Express 5:** async rejections forward natively, so no `asyncHandler` or redundant `try/catch { next(err) }`. Never reassign `req.query`; read validated input via `getValidated(res)` and auth context via `getAuthUser(res)`. Normalize `req.body ?? {}`, use named wildcards and `{/:param}` optional segments, and mount 404 with `app.use(notFoundMiddleware)`.
- **Errors & transactions:** throw the `AppError` hierarchy (`statusCode`, `UPPER_SNAKE_CASE` `code`, safe `message`, optional `details`, `isOperational`). One 4-argument handler normalizes Zod, body-parser, JWT, and PostgreSQL SQLSTATE errors and respects `res.headersSent`. Inside `getDb().transaction(...)`, return an outcome instead of throwing when a write (like incrementing failed attempts) must commit.
- **Responses & OpenAPI:** `{ data }`, paginated `{ data, meta }`, errors `{ error: { code, details? } }`; use `200`/`201`/`202`/`204`, `4xx`, and `429` per `docs/api/api-design-outline.md`. When adding or changing routes/schemas, update `api/scripts/generate-openapi.ts` and run `npm run openapi:generate --prefix api` (verify with `openapi:check`).
- **Validation, tenancy, and tests:** validate with Zod in middleware, scope every repository query by `workspaceId`, return `404 NOT_FOUND` to non-members, return DTOs rather than database rows or secrets, and test against real PostgreSQL with `createTestRuntime()` (`@electric-sql/pglite`) rather than fake repositories.
- **Full handbook:** `docs/standards/express-conventions.md`, only in the cases the `AGENTS.md` routing table lists (core entry points, global middleware or error handling, full `api/` PR review). Lint-enforced rules in `api/eslint.config.mjs` are not repeated here.
