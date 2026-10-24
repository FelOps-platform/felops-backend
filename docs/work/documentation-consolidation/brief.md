# Documentation consolidation

Status: Done
Created: 2026-10-24
Related work: [PR #1](https://github.com/FelOps-platform/felops-backend/pull/1)

## Goal

Make the backend design and coding-agent workflow one navigable documentation
set. Contributors should edit the current architecture and database design in
place and use work records to explain changes and link to those documents.

## Acceptance criteria

- The root README links both backend design and contributor guidance.
- `api/docs/architecture.md` and `api/docs/database.md` remain the canonical
  living designs; sprint, feature, and work records link to them.
- The team's Design → Implementation → Deployment process and the agent
  delivery loop agree without duplicating their instructions.
- Proposed behavior and unresolved design questions remain clearly separate
  from the implemented health endpoint and users schema.
- Apidog is identified as the API contract and mock workspace. Removing the
  retired local OpenAPI/Mintlify files leaves no active broken tooling or links.
- Workflow checks, changed-document links, relevant package checks, and an
  independent review pass before the updated PR is merged.

## Scope

Documentation, associated retired API-documentation tooling, and the existing
default-branch synchronization rule. API endpoint design and mocks follow the
database revision and Apidog access. This change does not implement endpoints,
settle the outstanding product contracts, migrate data, or deploy services.
