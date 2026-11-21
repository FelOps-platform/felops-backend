# Work brief: Backend design documentation

Status: Done
Created: 2026-11-21
Related decisions: [ADR-0007](../../adr/ADR-0007-oauth-provider-integrations.md), [ADR-0008](../../adr/ADR-0008-multiple-channel-instances.md), [ADR-0009](../../adr/ADR-0009-workspace-action-availability.md), [ADR-0010](../../adr/ADR-0010-workspace-only-knowledge.md)

## Problem and context

The backend design was spread across architecture, API, database, feature, AI contract, and workflow documents. The same decisions appeared in several places with different levels of detail, while some older flows still described multi-account OAuth, channel keys, approval hashes, and agent-scoped knowledge.

The repository still implements only the health endpoint and configuration scaffold. The documentation must describe the intended backend without presenting planned services as implemented behavior.

## Goal and non-goals

### Goal

- Make the backend design set internally consistent and easy to navigate.
- Give each major workflow one owning document and link to it elsewhere.
- Keep the API outline, DBML schema, feature pages, AI contract, ADRs, and agent workflow aligned.
- Make the database design readable through table groups, relationship notes, and modeling rules.
- Keep the shared Claude Code, Cursor, and OpenCode workflow aligned with the documentation checks.

### Non-goals

- Implementing API endpoints, database migrations, or AI Service behavior.
- Changing the frontend, deployment configuration, or runtime dependencies.
- Defining a workspace approval-policy editor.
- Defining full conversation transport behavior.

## Expected behavior

- Architecture is a system overview, backend component index, and decision-record index.
- API and database documents use the same resource names, identifiers, pagination rules, and error codes.
- Feature pages describe user-facing workflows and link to ADRs for durable technical decisions.
- OAuth uses one account per authorization with no pending account-selection flow.
- Channels use a numeric `channel_id` and a separate `channel_type`.
- Duplicate knowledge content is rejected with `409 DUPLICATE_SOURCE`.
- Approvals share one table, keep `params`, and do not use `params_hash`.
- Agent detail returns full assigned actions and sources; workspace action and knowledge lists stay paginated.
- Agent workflow adapters and checks recognize the final docs layout.

## Acceptance criteria

- [x] API outline, DBML schema, feature pages, AI contract, ADRs, and architecture links agree.
- [x] Architecture lists backend components with supporting documents and leaves frontend, providers, and LLM infrastructure out of the component index.
- [x] Database documentation explains table groups, relationships, modeling rules, and cascade behavior without a diagram.
- [x] OAuth, channel, knowledge, approval, and agent-assignment decisions are reflected in every owning document.
- [x] Agent workflow adapters and documentation checks match the final docs layout.
- [x] Focused documentation and workflow checks pass.
- [x] A fresh reviewer reviews the final diff and findings are resolved.
- [x] Planned services remain distinguishable from the implemented scaffold.

## Impacted areas

- Documentation: architecture, API outline, database guide, DBML schema, feature pages, AI contract, ADRs, standards, onboarding, and metadata.
- Agent workflow: Claude Code, Cursor, OpenCode commands and hooks, plus repository checks.
- Runtime, database, and deployment: no behavior change.

## Risks and constraints

- The documentation describes a planned implementation and can drift from code.
- Large design sets can duplicate facts; the consistency check covers the main known collisions.
- Database changes are design-only and do not create migrations.
- The API test suite needs Infisical bootstrap credentials, so this docs-only change does not run it.
