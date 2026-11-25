# FelOps Backend API

TypeScript/Express API for FelOps. The only implemented product route is `GET /api/v1/health`; product workflows in the documentation remain planned.

The AI Service is a separate repository. The Backend owns agent configuration, credentials, tool execution, approvals, and frontend conversation history. Provider credentials never leave the Backend.

## Setup

From the repository root, install dependencies without running lifecycle scripts:

```sh
npm ci --prefix api --ignore-scripts
```

Server startup and the test suite load runtime secrets from Infisical. They need `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, and `INFISICAL_PROJECT_ID`, provided through the team's secure process. `.env.example` lists the variable names. Do not commit credentials.

The install command skips Husky setup and does not configure Git's local `core.hooksPath`. Run checks explicitly.

## Commands

Run from the repository root:

```sh
npm run dev --prefix api
npm run lint --prefix api
npm run typecheck --prefix api
npm run build --prefix api
npm test --prefix api
```

The server and tests require Infisical bootstrap credentials; lint, typecheck, and build do not.

## Project map

- `src/app.ts` and `src/server.ts`: Express app and server; the health route is the only implemented endpoint.
- `src/config/` and `src/integrations/infisical/`: runtime configuration, database connection, logging, and secret retrieval.
- `src/database/schema.ts` and `drizzle/`: Drizzle schema and migrations.
- `tests/`: backend test suite.

## Design and contributor docs

- Project: [Documentation entry](../docs/README.md), [Architecture](../docs/architecture.md), [API outline](../docs/api/api-design-outline.md), and [Database schema](../docs/database/schema.dbml).
- Contributors: [Repository instructions](../AGENTS.md), [Agent onboarding](../docs/onboarding/agent-onboarding.md), [Project context](../docs/project-context.md), and [Verified metadata](../agent-metadata.md).

Low-level OpenAPI specifications are generated after implementation into `docs/api/openapi.client.yaml` and `docs/api/openapi.internal.yaml`.
