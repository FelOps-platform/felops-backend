# Felops Backend

## Setup

```bash
npm install
npm run dev
```

## Project Structure

```text
felops-backend/
├─ src/
│  ├─ app.ts                 # Application bootstrap
│  ├─ server.ts              # HTTP server setup
│  ├─ config/                # Runtime configuration and environment setup
│  │  ├─ env.ts
│  │  ├─ db.ts               # Database connection setup
│  │  └─ logger.ts
│  ├─ constants/             # Application constants
│  ├─ database/              # Database schema and data model definitions
│  │  └─ schema.ts
│  ├─ features/              # Feature-specific modules
│  ├─ integrations/          # External service adapters
│  │  └─ infisical/
│  │     └─ fetch-secrets.ts
│  ├─ middleware/            # Application middleware
│  ├─ shared/                # Shared utilities and middleware
│  │  ├─ constants/
│  │  └─ utils/
├─ tests/                # Shared utilities and middleware
│  ├─ unit/
│  └─ integration/
├─ docs/                     # Architecture and project documentation
├─ drizzle/                  # Database migrations and schema snapshots
├─ scripts/                  # Legacy utility scripts / maintenance tooling
├─ .husky/                   # Git hooks
├─ dist/                     # Build output
├─ package.json              # Scripts and dependencies
├─ tsconfig.json             # TypeScript config
├─ drizzle.config.ts         # Drizzle configuration
├─ vitest.config.ts          # Test configuration
├─ .env.example              # Example environment variables
├─ README.md                 # Project overview
└─ package-lock.json         # Locked dependency tree
```

The database connection is configured in `src/config/db.ts`, while the
database schema is defined in `src/database/schema.ts`.

## Environment

`NODE_ENV` selects the matching Infisical environment (`development`,
`production`, or `test`). Missing or unrecognized values default to
`development`.

At startup, the app uses Infisical Universal Auth to fetch secrets, then
validates the configuration with Zod. Provide `INFISICAL_CLIENT_ID`,
`INFISICAL_CLIENT_SECRET`, and `INFISICAL_PROJECT_ID` through the deployment
environment or a secure local setup. Obtain these bootstrap credentials
securely; do not commit them.

## Git Hooks

Before each commit, Husky runs `lint-staged` on staged TypeScript files.
`lint-staged` applies ESLint fixes and Prettier formatting; the pre-commit hook
does not run the test suite. Run tests separately with `npm test`.

## Commands

| Command                | Purpose                            |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Development server with watch mode |
| `npm run build`        | Build                              |
| `npm start`            | Production server                  |
| `npm test`             | Run tests                          |
| `npm run test:watch`   | Tests in watch mode                |
| `npm run lint`         | Lint                               |
| `npm run typecheck`    | Type-check                         |
| `npm run format`       | Format files                       |
| `npm run format:check` | Check formatting                   |
