# Implementation plan: [Short name]

Status: Draft / Planned / In Progress / Awaiting input / Done
Created: YYYY-MM-DD
Feature brief: [optional link]
Related issue: [optional link]

## 1. Goal

What will change and why? Keep this self-contained so a separate agent with zero chat history can implement directly from this file.

## 2. Authorization and scope

- Authorized by:
- In scope:
- Out of scope:
- Decisions still needed, if any:

A clear user request authorizes the work it describes. Do not add a redundant plan-approval step. Record unresolved decisions that need user input.

## 3. Evidence, conventions, and golden blueprint

- Product constraints: `docs/project-context.md`
- Owning feature/API docs: [links]
- Golden module blueprint to follow: `api/src/modules/workspaces/` (simple CRUD+auth) or `api/src/modules/auth/` (multi-workflow+transactions)
- Relevant ADRs or standards: `docs/standards/engineering-conventions.md`, `.agents/skills/express-api/SKILL.md`

Do not invent a stack, dependency, or product requirement.

## 4. API and data contracts

### HTTP endpoints (omit if no HTTP changes)

| Method & Path | Auth | Request (Zod schema) | Success | Error codes |
| --- | --- | --- | --- | --- |
| `GET /api/v1/...` | `authenticate` / Public | `query` / `body` / `params` | `200 { data }` | `401`, `404`, `422` |

### Data, transactions, and invariants

- Tables / columns touched (cite `api/src/database/`):
- Tenant / ownership scoping (`workspaceId` or `ownerId`, non-members get `404 NOT_FOUND`):
- Transaction boundaries (note any write that must commit even on error — return an outcome from `getDb().transaction(...)` and throw `AppError` outside):
- New Infisical runtime env keys (if any — add to `api/src/config/env.ts` and `api/tests/helpers/test-runtime.ts`, never commit values):

## 5. Affected files

- Modify:
- Create:
- OpenAPI sync (`api/scripts/generate-openapi.ts` — list new/updated `operationId`s and schemas; never rename existing Apidog `operationId`s):

## 6. Steps and atomic commit slices

Group implementation into small, reviewable, independently verified commits:

1. **Commit 1 (`docs(...)`):** Update owning feature/API docs (if contract changed) and verify `bash bin/check-backend-docs.sh`.
2. **Commit 2 (`feat(<module>): ...`):** Implement schemas, mapper, repository (`tx: DbExecutor = getDb()`), service(s), controller (`getValidated`/`getAuthUser`), plain router mounted in `api/src/routes.ts`, and PGlite tests.
3. **Commit 3 (`feat(openapi): ...`):** Register endpoints in `api/scripts/generate-openapi.ts`, run `npm run openapi:generate --prefix api` & `openapi:check`.
4. **Commit 4 (`docs(work): ...`):** Update `docs/work/<slug>/` status + evidence and `docs/project-context.md` after fresh-eyes review.

## 7. Test matrix & verification

List exact behaviors to verify via `createTestRuntime()` (`beforeAll`) + `runtime.reset()` (`beforeEach`) — never write `InMemory*Repository` fakes:

- Unit / service tests (happy path, scoping, edge cases, transaction rollback / commit behavior):
- HTTP integration tests (status codes, `{ data }` / `{ error: { code, details? } }` envelopes, auth `401`, non-member `404`, validation `422`):

| Check | Command |
| --- | --- |
| Lint & typecheck | `npm run lint --prefix api && npm run typecheck --prefix api` |
| Build & PGlite tests | `npm run build --prefix api && npm test --prefix api` |
| OpenAPI sync | `npm run openapi:check --prefix api` |
| Docs & harness | `bash bin/check-backend-docs.sh && bash bin/check-agent-workflow.sh` |

## 8. Risks and rollback

- Risk:
- Mitigation:
- Rollback:

## 9. Completion evidence

Record exact commands run, outcomes, commit hashes, and fresh-eyes review findings resolved. Mark Done only when acceptance criteria and checks pass.
