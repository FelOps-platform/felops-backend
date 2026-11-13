# SDD documentation restructure

Status: Done
Created: 2026-11-01

## Problem and context

The canonical design lives in `api/docs/`, while the Agent Seed workflow lives in
`docs/`. The split causes duplicated navigation, repeated design and process
text, and stale references to a standalone `mcp-server/` package that has no
runtime. The team wants one root documentation set that is the SDD source for
humans and agents, with project context, architecture, database, and delivery
forming the project constitution.

## Goal and non-goals

### Goal

- Make `docs/` the single documentation source.
- Present `project-context.md`, `architecture.md`, `database.md`, and
  `delivery.md` as the four-document constitution.
- Remove `api/docs/` and the standalone `mcp-server/` package.
- Keep Agent Seed workflow behavior unchanged; update only paths and hook
  recognition.
- Remove duplicated content and unreviewed future-work sections.

### Non-goals

- No MCP runtime or `api/src/mcp/` scaffold.
- No API endpoint, schema, migration, or deployment change.
- No change to roles, commands, skills, lifecycle, routing tiers, or approval
  rules.
- No Apidog workspace creation or contract design.

## Expected behavior

- A contributor or agent starts at `docs/README.md` and finds the four
  constitution documents, supporting records, and reading order.
- `architecture.md` is the single home for product workflows; feature files are
  removed after their unique main paths are merged.
- `delivery.md` combines the team Design → Implementation → Deployment sequence
  and Sprint 1 scope.
- No current-state document links to `api/docs/` or `mcp-server/`.
- Work records remain historical evidence; current paths are documented in
  `docs/README.md`.

## Acceptance criteria

- [x] `docs/README.md` is the constitution entry and lists the four core docs,
      reading order, and ownership.
- [x] `docs/project-context.md`, `docs/architecture.md`, `docs/database.md`, and
      `docs/delivery.md` exist and link to each other without copying the same
      content.
- [x] Feature workflows unique to `actions.md` and `integrations.md` are merged
      into `architecture.md`; the feature files and sprint file are deleted.
- [x] `api/docs/` is removed.
- [x] `mcp-server/` is removed and ADR-0002 records the embedded-module decision.
- [x] The TypeScript tooling clarification is preserved as ADR-0001.
- [x] No current-state document references `api/docs/`, `mcp-server/`, or
      `docs/specs/`.
- [x] Agent Seed roles, commands, skills, template structure, lifecycle, routing,
      and approval rules are unchanged.
- [x] Documentation reminders recognize the four constitution documents and
      still suppress on recognized documentation updates.
- [x] `bash bin/check-agent-workflow.sh` and
      `bash bin/check-opencode-config.sh` pass.
- [x] API lint, typecheck, and build pass; the test limitation is reported
      accurately.
- [x] A fresh reviewer reviews the final diff.

## Documentation design

- Constitution: `docs/README.md` plus `project-context.md`, `architecture.md`,
  `database.md`, and `delivery.md`.
- Change records: `docs/work/<slug>/{brief,plan,qa}.md`.
- Decisions: `docs/adr/`.
- Contracts: Apidog, linked from `delivery.md`.
- No `specs/` folder; the work brief is the change spec.

## Impacted areas

- Documentation: `docs/`, `api/docs/`, `README.md`, `api/README.md`,
  `AGENTS.md`, `agent-metadata.md`, `CLAUDE.md`.
- Agent workflow: `.claude/hooks`, `.cursor/hooks`, `.opencode/plugins`,
  `bin/check-*.sh`.
- Repository structure: `mcp-server/` deletion.
- Data, privacy, permissions: none.
- Runtime: none.

## Risks and constraints

- Relative links break when files move one level; the workflow link scan must
  pass.
- Hook path recognition could regress; fixture tests must cover canonical docs.
- Deleting `mcp-server/` is safe only because no code imports it; verify with
  `git grep`.
- Historical work records contain old path text; keep them as historical, fix
  broken links, and note this in `docs/work/README.md`.

## Open decisions

None. The structure, constitution entry, `delivery.md` name, and feature-merge
approach are decided.

## Evidence needed

- [x] Focused link and workflow checks.
- [x] API static checks.
- [x] Fresh review.
- [x] Recorded test limitation.
