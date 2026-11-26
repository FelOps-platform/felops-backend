---
name: express-api
description: Compact Express 5 conventions. Use when adding or changing routes, middleware, controllers, services, repositories, validation, or error handling under api/.
---

# Express 5 API work

- **Layers:** routes → middleware → controller → service → repository (Drizzle). Controllers own HTTP; services own business rules and `workspaceId` checks; repositories accept an optional `tx`.
- **Express 5:** async rejections forward natively, so no `asyncHandler` or redundant `try/catch { next(err) }`. Never reassign `req.query`; store validated input in `res.locals.validated`. Normalize `req.body ?? {}`, use named wildcards and `{/:param}` optional segments, and mount 404 with `app.use(notFoundMiddleware)`.
- **Errors:** throw the `AppError` hierarchy (`statusCode`, `UPPER_SNAKE_CASE` `code`, safe `message`, optional `details`, `isOperational`). One 4-argument handler normalizes Zod, body-parser, JWT, and PostgreSQL SQLSTATE errors and respects `res.headersSent`.
- **Responses:** `{ data }`, paginated `{ data, meta }`, errors `{ error: { code, details? } }`; use `200`/`201`/`202`/`204`, `4xx`, and `429` per `docs/api/api-design-outline.md`. Keep `docs/api/openapi.client.yaml` and `docs/api/openapi.internal.yaml` in sync.
- **Validation and tenancy:** validate with Zod in middleware, scope every repository query by `workspaceId`, return `404 NOT_FOUND` to non-members, use service-owned transactions, and return DTOs rather than database rows or secrets.
- **Full handbook:** `docs/standards/express-conventions.md`, only in the cases the `AGENTS.md` routing table lists (core entry points, global middleware or error handling, full `api/` PR review). Lint-enforced rules in `api/eslint.config.mjs` are not repeated here.
