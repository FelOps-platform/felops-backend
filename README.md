# FelOps Backend

Backend API for FelOps. The current implementation is a TypeScript and Express scaffold: the only product route is `GET /api/v1/health`. Product workflows are documented as planned behavior, not implemented endpoints.

## Requirements

- Node.js and npm
- Infisical bootstrap credentials for application startup and the test suite
- PostgreSQL when running database-backed behavior

The repository does not include credentials or deployment configuration. Do not request access to a shared vault just to run documentation checks.

## Setup

```bash
npm ci --prefix api --ignore-scripts
```

`--ignore-scripts` installs dependencies without changing local Git hook configuration. Runtime configuration is documented in [api/.env.example](api/.env.example).

## Commands

Run application commands from the repository root:

```bash
npm run lint --prefix api
npm run typecheck --prefix api
npm run build --prefix api
npm test --prefix api
```

Credential-free development checks:

```bash
bash bin/check-agent-workflow.sh
bash bin/check-opencode-config.sh
bash bin/check-backend-docs.sh
```

Startup and the existing health test import Infisical configuration. They require bootstrap credentials and may fail before application tests run when those credentials are unavailable.

## Repository layout

| Path | Purpose |
| --- | --- |
| `api/` | TypeScript and Express backend |
| `docs/` | Architecture, API, database, feature, AI contract, and work documentation |
| `bin/` | Repository and documentation checks |
| `.claude/`, `.cursor/`, `.opencode/` | Coding-agent host configuration |

## Documentation

Start at [docs/README.md](docs/README.md). Contributor workflow is in [AGENTS.md](AGENTS.md); verified technical state is in [agent-metadata.md](agent-metadata.md).
