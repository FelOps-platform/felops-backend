# Authentication & Workspace Onboarding (Matched to pen.dev Authent Screens)

> Historical implementation record. Current behavior is defined by [auth.md](../../features/auth.md) and [project-context.md](../../project-context.md); this file is not maintained as current API documentation.

Status: Done
Created: 2026-11-26
Updated: 2026-11-27 — the 60-second email+IP cooldown was removed; resend/reset now rely on per-IP route rate limits. Repeat sign-ups no longer overwrite credentials for unverified accounts. Email delivery failures return 503 UPSTREAM_UNAVAILABLE, the refresh cookie supports cross-site frontends via SameSite=None; Secure with an Origin check, and COOKIE_SECURE is derived from NODE_ENV rather than read from Infisical.

## Goal

Implement the Backend authentication module (`/api/v1/auth/*`), workspace select/create endpoints (`/api/v1/workspaces/*`), and the required Express 5 application foundation (`createApp()`, global middleware, `AppError` hierarchy, error normalizer, graceful shutdown, and SendGrid email adapter) so the API matches all `Authent` UI screens on `pen.dev` and the specifications in [auth.md](../../features/auth.md), [api-design-outline.md](../../api/api-design-outline.md), and [express-conventions.md](../../standards/express-conventions.md).

## Acceptance criteria

- [x] Express 5 app foundation is in place in `api/src/app.ts` (`createApp(deps)` pure factory) and `api/src/server.ts` (DB readiness check, Pino startup logging, graceful shutdown, fatal error handlers) following the mandatory middleware order in `docs/standards/express-conventions.md`.
- [x] Global error handling (`AppError` subclasses + central error normalizer + `notFoundMiddleware`) returns `{ error: { code, details? } }` for all `4xx`/`5xx` responses without leaking messages, stacks, or SQL.
- [x] `POST /api/v1/auth/sign-up` validates `{ name, email, password }`, normalizes email, handles new / existing unverified / existing verified accounts without enumeration, sends verification or account-exists email via SendGrid, and returns empty `202 Accepted`.
- [x] `POST /api/v1/auth/verify-email` validates `{ email, code }` (HMAC-SHA-256 hash before expiry, 5-attempt cap, single-use, 10-minute expiry), marks `is_verified = true`, creates a session, sets the `HttpOnly; SameSite=Strict` refresh cookie scoped to `/api/v1/auth`, and returns `200 { data: { accessToken, user } }`.
- [x] `POST /api/v1/auth/resend-verification` enforces a uniform 60-second cooldown keyed to normalized email + client IP (including unknown/verified emails), sends a new 6-digit code only for unverified accounts, and returns empty `202` or `429 RATE_LIMITED`.
- [x] `POST /api/v1/auth/sign-in` verifies Argon2id password hash, returns `401 INVALID_CREDENTIALS` on wrong email/password, `403 EMAIL_NOT_VERIFIED` for valid credentials on unverified accounts, and `200 { data: { accessToken, user } }` + refresh cookie on success.
- [x] `POST /api/v1/auth/refresh` reads the `<session_id>.<secret>` refresh cookie, rotates the refresh token, honors a brief concurrent-refresh grace window, revokes the session on mismatch outside the grace window (`401 SESSION_EXPIRED`), and returns `200 { data: { accessToken, user } }` + new refresh cookie.
- [x] `POST /api/v1/auth/sign-out` revokes the current session if present, clears the refresh cookie, and returns `204 No Content` idempotently.
- [x] `POST /api/v1/auth/password-reset/request` enforces the uniform 60-second cooldown keyed to normalized email + client IP, creates a reset code and sends a reset email for existing accounts, and returns empty `202` or `429 RATE_LIMITED`.
- [x] `POST /api/v1/auth/password-reset/verify` validates `{ email, code }` (matching the `pen.dev` reset-code verification screen `code` / `code checking`) with hash-before-expiry and 5-attempt enforcement, and returns `200 { data: { resetToken } }` without consuming the code until confirmation.
- [x] `POST /api/v1/auth/password-reset/confirm` validates `{ resetToken, newPassword }` (password strength >= 12 chars checked first → `422 WEAK_PASSWORD`), verifies `resetToken` against the unconsumed `auth_codes` row, updates the Argon2id password hash, sets `is_verified = true`, consumes the code, revokes all user sessions, and returns `204 No Content`.
- [x] Reusable `authenticate` middleware verifies `Authorization: Bearer <accessToken>` for protected routes.
- [x] `GET /api/v1/workspaces`, `POST /api/v1/workspaces`, and `GET /api/v1/workspaces/:workspaceId` require `authenticate`, list/create/fetch workspaces owned by the user (`role: 'owner'`, `agentsCount`), and return `404 NOT_FOUND` (`details: [{ resource: 'workspace' }]`) for non-owners or missing IDs.
- [x] Email delivery uses `EmailSender` with a SendGrid (`@sendgrid/mail`) adapter; route rate limiting uses `express-rate-limit`; cooldowns and concurrent-refresh grace windows use injectable in-memory stores behind interfaces.
- [x] `docs/features/auth.md`, `docs/features/workspaces.md` (new), and `docs/api/api-design-outline.md` are updated to reflect the 2-step reset flow and workspace select/create endpoints.
- [x] Credential-free unit and Supertest integration tests cover all auth & workspace endpoints, error codes, enumeration resistance, cooldowns/rate limits, token rotation/reuse detection, and error normalization; lint, typecheck, format check, build, and `bin/check-backend-docs.sh` pass.

## Scope

**In scope:**
- Express 5 foundation (`app.ts`, `server.ts`, `errors/`, `middleware/`, `config/env.ts`, `config/logger.ts`).
- Auth module (`api/src/modules/auth/`), Workspaces select/create module (`api/src/modules/workspaces/`), SendGrid email integration (`api/src/integrations/email/`), and interface-backed cooldown/grace stores.
- Docs updates (`docs/features/auth.md`, `docs/features/workspaces.md`, `docs/api/api-design-outline.md`) and `docs/project-context.md` technical state update upon completion.
- Unit and integration tests under `api/tests/`.

**Out of scope:**
- Multi-user workspace membership, invitations, and roles (only `workspaces.owner_id` exists in `schema.dbml`).
- Running `database:migrate` against a live PostgreSQL database.
- Redis-backed rate limiting, email outbox/retries, MFA, SSO/social login, email change, account deletion, or OpenAPI YAML regeneration.
