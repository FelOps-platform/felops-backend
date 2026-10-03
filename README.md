# Felops Backend

## Setup

```bash
npm install
npm run dev
```

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

Before each commit, Husky runs `lint-staged` on staged TypeScript files, runs
the test suite.

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
