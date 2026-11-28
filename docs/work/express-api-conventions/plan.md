# Implementation plan: Express 5 API conventions

Status: Done
Created: 2026-11-26
Feature brief: [brief.md](brief.md)

## 1. Goal

Add strict Express 5 conventions in three layers: zero-token mechanical rules in
[api/eslint.config.mjs](../../../api/eslint.config.mjs), a full on-demand reference in
[docs/standards/express-conventions.md](../../standards/express-conventions.md), and a compact
six-bullet cheat sheet in the agent roles and scoped Cursor rules.

## 2. Authorization and scope

- Authorized by: the user's explicit request to add Express 5 backend conventions, lint rules,
  documentation, and agent wiring.
- In scope: `api/eslint.config.mjs`, `docs/`, `AGENTS.md`, `CLAUDE.md`, `agent-metadata.md`, the
  implementer/reviewer roles under `.opencode/`, `.claude/`, and `.cursor/`, and one scoped Cursor
  rule.
- Out of scope: `api/src/` runtime code, new dependencies, middleware implementation, migrations,
  deployment, and product behavior.
- Decisions still needed: none.

## 3. Evidence and conventions

- Product constraints: [docs/project-context.md](../../project-context.md)
- Verified stack and commands: [agent-metadata.md](../../../agent-metadata.md),
  [api/package.json](../../../api/package.json), [api/tsconfig.json](../../../api/tsconfig.json)
- Existing API response/error contract: [docs/api/api-design-outline.md](../../api/api-design-outline.md)
- Cross-cutting rules owned elsewhere: [engineering-conventions.md](../../standards/engineering-conventions.md),
  [ai-engineering-rules.md](../../standards/ai-engineering-rules.md), and
  [agent-routing.md](../../standards/agent-routing.md)
- Verified installed versions: Express 5.2.1, `@types/express` 5.0.6, Zod 4.6.5, Pino 10.4.0,
  pino-http 11.0.0, Drizzle ORM 1.0.0-rc.4, pg 8.23.1, Vitest 5.0.3, Supertest 7.3.1, ESLint 10.12.0.
  No Node/import-boundary ESLint plugin is installed, so core `no-restricted-properties` and
  `no-restricted-imports` are used.

## 4. Affected areas

- Existing files/modules: `api/eslint.config.mjs`, `docs/README.md`,
  `docs/standards/agent-routing.md`, `AGENTS.md`, `CLAUDE.md`, `agent-metadata.md`, and the six
  implementer/reviewer role files under `.opencode/agents/`, `.claude/agents/`, and `.cursor/agents/`.
- New files/directories: `docs/standards/express-conventions.md`,
  `.cursor/rules/10-api-express.mdc`, and `docs/work/express-api-conventions/`.
- Data, API, or compatibility effects: none; no runtime route, schema, or dependency changes.

## 5. Steps

1. Extend `api/eslint.config.mjs` with scoped `src/**` rules:
   - `no-console: error`, with the `server.ts` bootstrap log exception.
   - `no-restricted-properties` for `process.env`, with only `config/env.ts` and
     `integrations/infisical/fetch-secrets.ts` exempt.
   - `no-restricted-imports` forbidding Express in `*.service.ts` and `drizzle-orm`/`config/db` in
     `*.controller.ts`.
2. Write the Express 5 reference, explicitly separating the current scaffold from target conventions
   and cross-referencing the API outline and engineering rules.
3. Index the reference and add progressive-disclosure routing to `docs/README.md`,
   `docs/standards/agent-routing.md`, `AGENTS.md`, and `CLAUDE.md`.
4. Add the compact cheat sheet to the six implementer/reviewer roles and the scoped Cursor rule.
5. Run the four requested checks, probe that each new lint rule fires, update `agent-metadata.md`,
   review the diff, and commit the completed unit.

## 6. Verification

| Check | Command or evidence |
| --- | --- |
| API lint | `npm --prefix api run lint` |
| Documentation consistency | `bash bin/check-backend-docs.sh` |
| Agent workflow parity and hook launches | `bash bin/check-agent-workflow.sh` |
| OpenCode config and doc-reminder plugin | `bash bin/check-opencode-config.sh` |
| Rule probes | Short-lived `api/src/__probe__*` files exercised `no-console`, `process.env`, service `express`, and controller `drizzle-orm`/`config/db` rules; files removed after the probe |
| Exemptions | `npx eslint src/config/env.ts src/integrations/infisical/fetch-secrets.ts src/server.ts` passed |
| Diff review | Inspect `git diff` for scope, secrets, and unintended runtime changes |

## 7. Risks and rollback

- Risk: a future service or controller uses a different filename suffix and bypasses the scoped
  import rules. Mitigation: the convention document names the suffix pattern, and review checks it.
- Risk: the handbook describes target middleware that is not implemented yet. Mitigation: section 1
  labels the current scaffold and section 4 states the target order is not current behavior.
- Risk: role-file duplication drifts across hosts. Mitigation: the same compact section is applied to
  all six roles; the workflow checks validate frontmatter, link targets, and OpenCode structure.
- Rollback: revert this commit. No runtime code or data changes are involved.

## 8. Completion evidence

Completed on 2026-11-26 on branch `feature/auth`:

- `npm run lint --prefix api`: Pass.
- `bash bin/check-backend-docs.sh`: Pass.
- `bash bin/check-agent-workflow.sh`: Pass (also runs the backend documentation check).
- `bash bin/check-opencode-config.sh`: Pass.
- Lint-rule probes: the four scoped rules each reported an error on short-lived `api/src/__probe__*`
  files; `src/config/env.ts`, `src/integrations/infisical/fetch-secrets.ts`, and `src/server.ts`
  passed under the intended exemptions. The probe files were removed.
- Transaction type snippet: a temporary root type file compiled with `npx tsc --noEmit`; the file was
  removed.
- `api/src/` runtime source and dependencies: unchanged.
- Tests: not run; the current suite imports Infisical configuration and needs bootstrap credentials.
- Fresh-eyes review: the first pass requested changes for the MCP mount, root probe reconciliation,
  SQLSTATE 400 versus 422/409, section 6 duplication, timestamp casing, the transaction snippet import,
  `.env.example` guidance, and `req.body` wording. All findings were addressed; the focused re-review
  returned `verdict: "pass"` with no findings.
