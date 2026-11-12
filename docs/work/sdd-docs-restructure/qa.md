# Verification: SDD documentation restructure

Status: Done
Date: 2026-11-01
Review date: 2026-11-12
Brief: [brief.md](brief.md)
Plan: [plan.md](plan.md)

## Summary

`docs/` is now the single documentation source. `docs/README.md` is the
constitution entry, and the four core documents are `docs/project-context.md`,
`docs/architecture.md`, `docs/database.md`, and `docs/delivery.md`. The feature
and sprint files were merged and removed, `api/docs/` and the `mcp-server/`
placeholder were deleted, and the documentation reminders and their fixtures now
recognize the constitution documents.

## Checks

| Check | Command | Result |
| --- | --- | --- |
| Agent workflow and local links | `bash bin/check-agent-workflow.sh` | Passed: "Agent workflow configuration, adapter parity, local links, and configured hook launches passed." |
| OpenCode configuration | `bash bin/check-opencode-config.sh` | Passed: "OpenCode agents, commands, plugin, and approval rules passed." |
| API lint | `npm run lint --prefix api` | Passed; ESLint exited 0. |
| API typecheck | `npm run typecheck --prefix api` | Passed; `tsc --noEmit` exited 0. |
| API build | `npm run build --prefix api` | Passed; clean and `tsc -p tsconfig.build.json` exited 0. |
| Whitespace | `git diff --check` | Passed; only Git's LF-to-CRLF working-copy warnings were printed. |
| Stale paths | `git grep -n "api/docs\|mcp-server\|docs/specs"` | Only historical work records and this work record's brief, plan, and QA matched; no current-state document matched. |

The two `bash` checks were run through Git Bash on Windows. The bare `bash`
command in this environment resolves to WSL, which rejects the repository's CRLF
working-copy scripts with `set: pipefail: invalid option name`; Git Bash runs the
same scripts successfully. CI checks out LF line endings and runs them directly.

The workflow link scan inside `bin/check-agent-workflow.sh` resolved every local
Markdown link in `AGENTS.md`, `agent-metadata.md`, `docs/`, and the Cursor rules.
The hook fixtures exercised the Claude, Cursor, and OpenCode reminders, including
suppression by each constitution document and by committed work records.

## Test limitation

`npm test --prefix api` fails before test collection at the import-time
Infisical credential guard:

```text
Error: Infisical client ID, secret, and project ID must be set in environment variables.
 ❯ fetchSecrets src/integrations/infisical/fetch-secrets.ts:11:11
 ❯ src/config/env.ts:14:23
 ❯ src/config/logger.ts:4:1
 ❯ src/app.ts:2:1
```

The suite reported `Test Files 1 failed (1)` and `Tests no tests`. This is the
known bootstrap-credential limitation described in `AGENTS.md`; no credentials
were invented or requested, and this documentation change does not claim an
authenticated runtime test.

The implementer also ran `npm ci --prefix api --ignore-scripts --no-audit
--no-fund` to make the API checks runnable. It completed with a non-fatal
`EBADENGINE` warning for `lint-staged` (requires Node >=22.22.1; this environment
has Node 22.14.0). No dependency or lockfile files changed.

## Review

Reviewed 2026-11-12 by a fresh reviewer subagent that did not implement the
change. Verdict: `changes-requested` with one minor finding: the work record was
still In Progress with unchecked acceptance criteria and a pending review note.
The finding was resolved by checking the acceptance criteria and evidence,
recording this review, and advancing the work record to Done. The reviewer found
no material issue with the documentation content, merges, hook recognition,
fixtures, stale-path cleanup, or check results.

## Follow-ups

- None outside the approved scope. The product credential-delivery and
  rule-synchronization decisions remain open in `docs/architecture.md`, and the
  database revision remains open in `docs/database.md`.
