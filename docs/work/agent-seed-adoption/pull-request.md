# chore: adopt Agent Seed workflow for FelOps Backend

Base branch: `main`

## Summary

Add a shared coding-agent workflow adapted to the existing TypeScript backend:
repository instructions, verified project context, Claude Code and Cursor
adapters, and work/design/review templates. Contributors can use the same
clarify → explore → plan → implement → verify → independent review loop within
the team's Design → Implementation → Deployment sprint process.

## What changed

- Document the real `api/` layout, separate AI Service, and placeholder MCP package,
  distinguishing implemented behavior from architecture plans.
- Add role-tier routing intent: fast explorers and balanced implementers/reviewers,
  mapped by the host to available models without repository model pins.
- Add `/onboard`, `/plan`, `/implement`, `/ship`, reusable skills, and bounded
  documentation reminders that recognize backend design updates under `api/docs/`.
- Add work and ADR templates, a backend-aware PR template, and credential-free
  GitHub workflow validation.
- Keep local agent settings and session state out of Git.

## Verification

- Locked API dependency install, lint, typecheck, and build passed.
- Existing `npm test --prefix api` fails at the Infisical startup guard before
  collecting tests without bootstrap credentials; no test pass is claimed.
- Hook behavior checked in temporary Git fixtures, including root/nested working
  directories, linked worktrees, docs changes, and filenames with spaces.
- Final workflow validation, independent review, and merge compatibility evidence
  passed and are recorded in `docs/work/agent-seed-adoption/qa.md`.
- Application code, dependency manifests, migrations, and existing backend
  documentation remain unchanged.

## Documentation and compatibility

See `docs/work/agent-seed-adoption/` for the brief, plan, and verification evidence.
Documentation PR #1 remains a separate change. This integration links to its
planning context and preserves its files. The MCP vault/rules access questions
remain open.

## Risks and rollback

Development tooling only; no new application runtime dependencies. Hosts must
support model selection to enforce the intended role tiers; `model: inherit`
remains the portable fallback. Revert the integration commit to remove the setup.
This PR does not change or deploy product behavior.

## Checklist

- [x] Acceptance criteria addressed
- [x] Framework checks and independent review complete
- [x] Backend baseline results recorded accurately
- [x] Implemented and planned services distinguished
- [x] No credentials or unrelated application changes included
