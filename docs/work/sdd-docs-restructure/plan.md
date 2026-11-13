# Implementation plan: SDD documentation restructure

Status: Done
Created: 2026-11-01
Feature brief: [brief.md](brief.md)

## 1. Goal

Consolidate all project documentation under `docs/` as an SDD constitution,
remove `api/docs/` and `mcp-server/`, merge unique feature workflows into
`architecture.md`, and fold Sprint 1 into `delivery.md` while preserving Agent
Seed workflow behavior.

## 2. Authorization and scope

- Authorized by: the active user request to restructure docs, remove `api/docs/`
  and `mcp-server/`, and keep the Agent Seed workflow.
- In scope: documentation structure, content sync and deduplication, path
  references, hook recognition, check fixtures, MCP placeholder deletion, ADRs,
  and the work record.
- Out of scope: MCP runtime, API code, schema and migrations, Apidog contracts,
  deployment, pushes, and merges.
- Decisions still needed: none.

## 3. Evidence and conventions

- Product constraints: `docs/project-context.md`.
- Verified stack and commands: `agent-metadata.md` and `api/package.json`.
- Agent workflow: `AGENTS.md`, `docs/onboarding/`, `docs/templates/`.
- Current canonical designs: `api/docs/architecture.md`,
  `api/docs/database.md`, `api/docs/workflow.md`.
- Existing work records: `docs/work/agent-seed-adoption/`,
  `docs/work/documentation-consolidation/`, `docs/work/opencode-host-config/`.
- Conventions: one owner per fact; one documentation index; no `specs/` folder;
  the work brief is the change spec.

## 4. Affected areas

- Existing files/modules:
  - Move: `api/docs/architecture.md` → `docs/architecture.md`
  - Move: `api/docs/database.md` → `docs/database.md`
  - Move/rename: `api/docs/workflow.md` → `docs/delivery.md`
  - Move/convert: `api/docs/clarifications/typescript-tooling.md` →
    `docs/adr/ADR-0001-typescript-7-tooling.md`
  - Merge/delete: `api/docs/features/actions.md` and `integrations.md` →
    `docs/architecture.md`
  - Merge/delete: `api/docs/sprints/sprint-1.md` → `docs/delivery.md`
  - Update: `AGENTS.md`, `agent-metadata.md`, `README.md`, `api/README.md`,
    `docs/project-context.md`, `docs/onboarding/*`, `docs/templates/*`,
    `docs/work/README.md`
  - Update: `.claude/hooks/doc-reminder.mjs`,
    `.cursor/hooks/doc-reminder.mjs`,
    `.opencode/plugins/doc-reminder/index.mjs`,
    `bin/check-agent-workflow.sh`, `bin/check-opencode-config.sh`
  - Delete: `api/docs/` after moves; `mcp-server/` placeholder
  - New: `docs/README.md`,
    `docs/adr/ADR-0002-embed-mcp-in-api-service.md`,
    `docs/work/sdd-docs-restructure/{brief,plan,qa}.md`
- New files/directories: `docs/README.md`, ADR-0002, and the work record.
- Data, API, or compatibility effects: none.

## 5. Steps

1. Create `docs/work/sdd-docs-restructure/` and copy this brief and plan into it.
2. `git mv api/docs/architecture.md docs/architecture.md`, then move
   `database.md`; rename `workflow.md` to `docs/delivery.md`; convert
   `clarifications/typescript-tooling.md` to
   `docs/adr/ADR-0001-typescript-7-tooling.md`.
3. Merge the unique main paths from `features/actions.md` and
   `features/integrations.md` into `architecture.md`; remove pending failure
   lists and Future work; delete the feature files.
4. Merge `sprints/sprint-1.md` goal, scope, and exclusions into
   `delivery.md`; delete the sprint file.
5. Create `docs/README.md` as the constitution entry with reading order,
   ownership, SDD mapping, and status rules.
6. Create ADR-0002 for embedding MCP in the API service; update architecture,
   `AGENTS.md`, metadata, project context, and READMEs.
7. Deduplicate content: remove repeated documentation indexes, the
   implemented/planned table from project context, duplicate open decisions, and
   repeated Apidog handoff paragraphs.
8. Delete `api/docs/` and `mcp-server/`.
9. Update all path references in `AGENTS.md`, `agent-metadata.md`, `README.md`,
   `api/README.md`, `docs/onboarding/`, `docs/templates/`, and
   `docs/work/README.md`.
10. Update hook and plugin recognition and check fixtures from `api/docs` to
    `docs`; add canonical-document suppression cases.
11. Run verification, fix findings, and review the full diff.
12. Record evidence in `docs/work/sdd-docs-restructure/qa.md`, update
    `agent-metadata.md` verification links, and commit locally.

## 6. Verification

| Check | Command or evidence |
| --- | --- |
| Focused behavior | `bash bin/check-agent-workflow.sh` |
| OpenCode config | `bash bin/check-opencode-config.sh` |
| API lint | `npm run lint --prefix api` |
| API typecheck | `npm run typecheck --prefix api` |
| API build | `npm run build --prefix api` |
| Stale paths | `git grep -n "api/docs\|mcp-server\|docs/specs"` |
| Whitespace | `git diff --check` |
| Tests | `npm test --prefix api` is expected to fail at the Infisical guard without credentials; report the limitation |
| Review | A fresh reviewer checks the final diff |

## 7. Risks and rollback

- Risk: broken relative links after the move. Mitigation: the workflow link scan
  and a full link fix pass.
- Risk: documentation reminder regression. Mitigation: updated fixtures and
  canonical-document suppression cases.
- Risk: deleting `mcp-server/` affects an import. Mitigation: `git grep`; no
  imports were found.
- Risk: content loss during merge. Mitigation: `git mv`, diff review, and
  historical work records.
- Rollback: revert the completed change commit; Git history preserves all moved
  and deleted files.

## 8. Completion evidence

Record the commands, outcomes, and review findings in
`docs/work/sdd-docs-restructure/qa.md`. Mark Done only when acceptance criteria
and relevant verification are complete. No push, merge, or deployment without
explicit authorization.
