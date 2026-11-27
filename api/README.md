# FelOps Backend API

TypeScript/Express API for FelOps. Implemented routes cover `GET /api/v1/health`, authentication (`/api/v1/auth/*`), and owner-scoped workspace onboarding (`/api/v1/workspaces/*`); other product workflows in the documentation remain planned.

The AI Service is a separate repository. The Backend owns agent configuration, credentials, tool execution, approvals, and frontend conversation history. Provider credentials never leave the Backend.

## Deployment

The API is deployed on Render at `https://felops-backend.onrender.com` (health: `/api/v1/health`). Frontend integration and local proxy setup are documented in [`docs/development/frontend-integration.md`](../docs/development/frontend-integration.md).

## Setup

From the repository root, install dependencies without running lifecycle scripts:

```sh
npm ci --prefix api --ignore-scripts
```

Server startup loads runtime secrets from Infisical via `loadEnv()` using `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, and `INFISICAL_PROJECT_ID` (`.env.example` lists bootstrap variable names; never commit credentials). Runtime secrets validated in `src/config/env.ts` include `LOG_LEVEL`, `PORT`, `DATABASE_URL`, `TRUST_PROXY`, `CORS_ORIGINS`, `JWT_ACCESS_SECRET`, `JWT_RESET_SECRET`, `AUTH_CODE_PEPPER`, `REFRESH_TOKEN_PEPPER`, `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `EMAILJS_TEMPLATE_VERIFICATION_ID`, and `EMAILJS_TEMPLATE_RESET_ID`. `COOKIE_SECURE` is derived from `NODE_ENV` (`production` only).

The install command skips Husky setup and does not configure Git's local `core.hooksPath`. Run checks explicitly.

## Commands

The command table is in [AGENTS.md](../AGENTS.md#commands); start the dev server with `npm run dev --prefix api`. Server startup requires Infisical bootstrap credentials; tests run offline against in-memory PostgreSQL (`@electric-sql/pglite` + real Drizzle migrations) without Infisical credentials.

## Request lifecycle

```text
server.ts (loadEnv → initLogger → initDatabase → listen)
  └─ app.ts (trust proxy → requestId → httpLogger → helmet → cors → cookieParser → json 100kb)
       ├─ GET /api/v1/health
       └─ routes.ts (/api/v1)
            ├─ /auth        → rateLimit → validate → controller → services/* → repository → Postgres
            └─ /workspaces  → authenticate → validate → controller → service → repository → Postgres
       └─ notFoundMiddleware → errorHandlerMiddleware ({ error: { code, details? } })
```

- **No import-time I/O:** `env.ts` and `db.ts` only connect when `server.ts` calls `loadEnv()` and `initDatabase()` (or when tests call `createTestRuntime()`).
- **OpenAPI sync:** Update `scripts/generate-openapi.ts` and run `npm run openapi:generate --prefix api` whenever routes or Zod schemas change (`openapi:check` verifies zero drift).

## Project map

- `src/app.ts`, `src/routes.ts`, and `src/server.ts`: pure `createApp()` factory, `/api/v1` router mount, and process bootstrap (DB readiness, graceful shutdown, fatal handlers).
- `src/errors/` and `src/middleware/`: `AppError` hierarchy, central error normalizer, request ID, Zod validation (`validate` / `getValidated`), bearer authentication (`authenticate` / `getAuthUser`), `express-rate-limit` wrapper, and 404/error handlers.
- `src/modules/auth/` and `src/modules/workspaces/`: plain-function golden blueprints — `workspaces/` (3 owner-scoped endpoints, minimal CRUD+auth) and `auth/` (10 endpoints across workflow-split services + transactions).
- `src/config/` and `src/infra/`: runtime configuration (`loadEnv()`/`getConfig()`), database lifecycle (`initDatabase()`/`getDb()`), Pino logging with redaction, Infisical secret retrieval, and the EmailJS email sender over HTTPS.
- `src/database/schema.ts` and `drizzle/`: Drizzle schema and migrations.
- `tests/`: credential-free unit and Supertest integration test suite.

## Design and contributor docs

- Project: [Documentation entry](../docs/README.md), [Architecture](../docs/architecture.md), [API outline](../docs/api/api-design-outline.md), and [Database schema](../docs/database/schema.dbml).
- Contributors: [Repository instructions](../AGENTS.md) and [Project context](../docs/project-context.md) (including verified technical state).

Client OpenAPI (`docs/api/openapi.client.yaml`, imported into Apidog) is generated from Zod 4 schemas via `npm run openapi:generate --prefix api`; `docs/api/openapi.internal.yaml` will be generated once internal routes exist.
