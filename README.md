# FelOps Backend

Backend API for FelOps (TypeScript + Express 5). Implemented routes cover `GET /api/v1/health`, authentication (`/api/v1/auth/*`), and owner-scoped workspaces (`/api/v1/workspaces/*`); other product workflows in `docs/` remain planned.

## Requirements

- Node.js and npm
- Infisical bootstrap credentials for live server startup (tests run offline via in-memory `@electric-sql/pglite`)
- PostgreSQL when running the live server or migrations

The repository does not include credentials or deployment configuration. Do not request access to a shared vault just to run tests or documentation checks.

## Setup and commands

```bash
npm ci --prefix api --ignore-scripts
```

`--ignore-scripts` installs dependencies without changing local Git hook configuration. Bootstrap env vars are listed in [api/.env.example](api/.env.example). The command table (lint, typecheck, build, OpenAPI generate/check, PGlite tests, and docs/harness checks) is in [AGENTS.md](AGENTS.md#commands).

Live server startup (`npm run dev --prefix api`) requires Infisical bootstrap credentials; `npm test --prefix api` runs offline against PGlite with real Drizzle migrations.

## Repository layout

| Path | Purpose |
| --- | --- |
| `api/` | TypeScript and Express backend |
| `docs/` | Architecture, API, database, feature, AI contract, and work documentation |
| `bin/` | Repository and documentation checks |
| `.agents/` | Canonical coding-agent skills, roles, and shared hook logic ([guide](.agents/README.md)) |
| `.claude/`, `.cursor/`, `.opencode/` | Thin host adapters that point at `.agents/` |

## Documentation

Start at [docs/README.md](docs/README.md). Contributor and coding-agent rules are in [AGENTS.md](AGENTS.md); product context and verified technical state are in [docs/project-context.md](docs/project-context.md).