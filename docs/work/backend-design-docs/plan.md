# Implementation plan: Backend design documentation

Status: Done
Created: 2026-11-21
Brief: [brief.md](brief.md)

## 1. Goal

Produce one connected backend design set for the API, database, feature workflows, AI Service contract, architecture decisions, and shared agent workflow, without changing product runtime behavior.

## 2. Authorization and scope

- Authorized by: the user request to finalize the backend documentation, keep feature flows concise, use numeric channel identities, simplify OAuth, reject duplicate knowledge, and align the agent workflow.
- In scope: documentation structure and content, DBML schema, API outline, AI contract, ADRs, standards, host adapters, checks, and work records.
- Out of scope: API implementation, migrations, AI Service implementation, frontend code, deployment, and external provider changes.
- Decisions still needed: none for this documentation pass.

## 3. Evidence and conventions

- Product constraints: [project context](../../project-context.md).
- Architecture and components: [architecture](../../architecture.md).
- Documentation format: [document conventions](../../standards/document-conventions.md).
- Engineering rules: [engineering conventions](../../standards/engineering-conventions.md).
- Verified repository state: [agent metadata](../../../agent-metadata.md).

## 4. Affected areas

- New design documents: API outline, DBML schema, database guide, feature pages, AI contract, and ADRs 0003-0010.
- Updated documents: architecture, project context, delivery, onboarding, standards, templates, READMEs, and agent metadata.
- Workflow surfaces: `.claude/`, `.cursor/`, `.opencode/`, `AGENTS.md`, and documentation reminder hooks.
- Checks: `bin/check-agent-workflow.sh`, `bin/check-backend-docs.sh`, `bin/check-opencode-config.sh`, and CI workflow definitions.
- Data, API, or compatibility effects: none; the schema and contracts are planned.

## 5. Steps

1. Add the API outline, OpenAPI stubs, and canonical DBML schema.
2. Document workspace workflows for integrations, actions, knowledge, agents, approvals, and channels.
3. Add the AI Service contract and record the Backend/AI Service decisions in ADRs.
4. Add documentation and engineering conventions and align the host adapters and `/design` command.
5. Add the backend documentation consistency check and update the agent workflow checks.
6. Run a final pass for naming, pagination, channel identity, OAuth scope, duplicate knowledge, approvals, and ownership.
7. Validate local links, code fences, Mermaid blocks, schema syntax, and whitespace.
8. Review the final diff and record evidence in [qa.md](qa.md).

## 6. Verification

| Check | Command or evidence |
| --- | --- |
| Documentation consistency | `bash bin/check-backend-docs.sh` |
| Agent workflow and local links | `bash bin/check-agent-workflow.sh` |
| OpenCode configuration | `bash bin/check-opencode-config.sh` |
| DBML syntax | `@dbml/core` parser against `docs/database/schema.dbml` |
| Whitespace | `git diff --check` |
| API runtime checks | Not run; no application code changed and the suite requires Infisical credentials |

## 7. Review and close-out

- Review the full branch diff with a fresh reviewer.
- Resolve blocking findings before opening a pull request.
- Keep the branch at eight commits; amend the final documentation commit when the working tree changes.
- Do not push or open the pull request without explicit confirmation.
