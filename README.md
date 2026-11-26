# FelOps Backend

Backend API for FelOps. The current implementation is a TypeScript and Express scaffold: the only product route is `GET /api/v1/health`. Product workflows are documented as planned behavior, not implemented endpoints.

## Requirements

- Node.js and npm
- Infisical bootstrap credentials for application startup and the test suite
- PostgreSQL when running database-backed behavior

The repository does not include credentials or deployment configuration. Do not request access to a shared vault just to run documentation checks.

## Setup and commands

```bash
npm ci --prefix api --ignore-scripts
```

`--ignore-scripts` installs dependencies without changing local Git hook configuration. Runtime configuration is documented in [api/.env.example](api/.env.example). The command table (lint, typecheck, build, test, and the credential-free repository checks) is in [AGENTS.md](AGENTS.md#commands).

Startup and the existing health test import Infisical configuration. They require bootstrap credentials and may fail before application tests run when those credentials are unavailable.

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