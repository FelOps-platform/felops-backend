# FelOps Backend

This is the TypeScript/Express API scaffold. The only implemented HTTP route is
`GET /api/v1/health`; product workflows in the design documents remain planned.

## Setup

From the repository root, install dependencies without running lifecycle scripts:

```sh
npm ci --prefix api --ignore-scripts
```

Server startup and the test suite load runtime secrets from Infisical. They need
`INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, and `INFISICAL_PROJECT_ID`,
provided through the team's secure setup process; `.env.example` lists the
variable names. Do not commit credentials.

The install command skips Husky's setup script and does not configure Git's
local `core.hooksPath`. Hook files live in `.husky/`; activation depends on the
existing Git configuration, so run checks explicitly.

## Commands

Run from the repository root:

```sh
npm run dev --prefix api
npm run lint --prefix api
npm run typecheck --prefix api
npm run build --prefix api
npm test --prefix api
```

The server and tests require Infisical bootstrap credentials; lint, typecheck,
and build do not.

## Project map

- `src/app.ts` and `src/server.ts`: Express app and server; the health route is
  the only implemented endpoint.
- `src/config/` and `src/integrations/infisical/`: runtime configuration,
  database connection, logging, and secret retrieval.
- `src/database/schema.ts` and `drizzle/`: Drizzle schema and migrations.
- `tests/`: backend test suite.
- `docs/`: backend architecture, database, feature, and workflow documents.

## Design and contributor docs

- Backend: [Architecture](docs/architecture.md), [Database](docs/database.md),
  [Workflow](docs/workflow.md), [Actions](docs/features/actions.md), and
  [Integrations](docs/features/integrations.md).
- Contributors: [Repository instructions](../AGENTS.md),
  [Agent onboarding](../docs/onboarding/agent-onboarding.md),
  [Project context](../docs/project-context.md), and
  [Verified metadata](../agent-metadata.md).

Apidog is the intended source for API contracts and mocks. Workspace invitation
and access, along with the database design revision, are pending. No Apidog
workspace URL or existing mock collection is documented here.
