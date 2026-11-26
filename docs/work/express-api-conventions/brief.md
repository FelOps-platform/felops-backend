# Brief: Express 5 API conventions

Status: Done
Created: 2026-11-26

## Goal

Add a three-layer Express 5 convention system without making every agent read a long handbook:
mechanical ESLint rules, an on-demand reference, and a compact cheat sheet in the implementer and
reviewer roles.

## Acceptance criteria

- [x] [api/eslint.config.mjs](../../../api/eslint.config.mjs) scopes `no-console`, `process.env`, and
  service/controller import boundaries to `src/**`, with only the existing bootstrap files exempt.
- [x] [docs/standards/express-conventions.md](../../standards/express-conventions.md) documents the
  Express 5 rules, layer layout, middleware order, error contract, responses, validation, tenancy,
  configuration, logging, shutdown, and testing without duplicating
  [engineering-conventions.md](../../standards/engineering-conventions.md) or the
  [API outline](../../api/api-design-outline.md).
- [x] The docs index, agent routing, `AGENTS.md`, and `CLAUDE.md` point routine `api/` work at the
  compact cheat sheet and reserve the full handbook for app/server, global middleware/error-handling,
  and full API review changes.
- [x] Implementer and reviewer roles under `.opencode/`, `.claude/`, and `.cursor/` carry the same
  compact six-bullet cheat sheet. A scoped `.cursor/rules/` file applies it to `api/**`.
- [x] `npm --prefix api run lint`, `bash bin/check-backend-docs.sh`,
  `bash bin/check-agent-workflow.sh`, and `bash bin/check-opencode-config.sh` pass.

## Out of scope

- Runtime changes in `api/src/`, new dependencies, Express middleware implementation, and migrations.
- Reading or loading the full implementation corpus during onboarding.
