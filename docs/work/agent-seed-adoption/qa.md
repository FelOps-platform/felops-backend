# Verification evidence

Date: 2026-10-22
Status: Done

## Backend baseline

The adoption leaves `api/` and `mcp-server/` unchanged. Commands run from the root:

| Command | Result |
| --- | --- |
| `HUSKY=0 npm ci --prefix api --ignore-scripts --no-audit --no-fund` | Pass; installed 402 packages from the existing lockfile |
| `npm run lint --prefix api` | Pass |
| `npm run typecheck --prefix api` | Pass |
| `npm run build --prefix api` | Pass |
| `npm test --prefix api` with bootstrap credentials removed from the environment | Fails before collecting tests: existing Infisical client ID, secret, and project ID guard |
| `git diff --exit-code -- api mcp-server` | Pass; existing application files unchanged |

The test failure originates in
`api/src/integrations/infisical/fetch-secrets.ts`, imported by configuration and
logging before the existing health test can run. No vault was contacted, no
credentials were added, and no application change was made to conceal this
baseline limitation. Workflow CI checks the agent setup only.

## Framework checks

- Hook worker verified both native output protocols in temporary Git fixtures:
  clean worktree, code-only changes, recognized root docs, `api/docs/`, root and
  nested `api/` working directories, linked worktrees, and renames with spaces.
  Both hooks passed `node --check`.
- `bash bin/check-agent-workflow.sh` passes: helper syntax, host configuration,
  adapter parity, local workflow links, and end-to-end configured hook launches.
  Claude's native argv uses its project-root placeholder and was exercised from
  `api/`; Cursor's command was exercised from its documented project-root cwd.
- Independent review found a relative Claude launcher path and pending QA text.
  The launcher now uses native project-root argv; this record is updated. The
  original Cursor project-relative command follows its documented host contract.
  Independent follow-up review passed with no remaining implementation findings.
- PR #1 compatibility: zero overlapping paths and a clean three-way merge in a
  temporary index against head `0b3b92c0939c637613ce160f7c12dc075c3a27e3`, using
  `git read-tree -m --aggressive`. The active branch and worktree were not merged.
- Staged diff passed whitespace and credential/private-home-path pattern checks.

## Delivery

Local preparation only, as requested after the access check. The branch targets
`main`. No push, GitHub PR, merge, or deployment has been performed.
