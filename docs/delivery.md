# Delivery

This page owns the team delivery stages and their exit gates. The [documentation index](README.md) owns the reading order and document map; [AGENTS.md](../AGENTS.md) owns the contributor execution loop and the command list.

## 1. Design

Produce enough design to implement safely:

- Product scope and constraints in [project context](project-context.md).
- Service boundaries and flows in [architecture](architecture.md).
- API shape, formatting, and errors in the [API outline](api/api-design-outline.md).
- Tables and relationships in [schema.dbml](database/schema.dbml).
- Workflow behavior in [features](features/).
- External contracts in the [AI Service contract](ai-service-integration/ai-service-contract.md) when relevant.
- Durable decisions in [ADR](adr/README.md).

For substantial work, create `docs/work/<slug>/` with a brief and plan. The brief owns the requested behavior and acceptance criteria; the plan owns the implementation approach.

**Exit gate:** behavior, data, edge cases, and contract changes are agreed and linked from one work record.

## 2. Implementation

Implement only the authorized scope. Follow the owning design rather than inventing behavior in code.

- Update the owning design first when the design changes.
- Add or update the Drizzle schema and migration when database behavior is authorized.
- Keep provider credentials in the Backend. Never send them to the AI Service or frontend.
- Add focused tests for new behavior and important failure paths.
- Do not run migrations, connect real integrations, or contact shared vaults without explicit authorization.

**Exit gate:** the change works locally, focused tests pass, and the implementation matches the design.

## 3. Contract generation

The API outline is the high-level design. After implementation, generate the low-level OpenAPI specifications for other developers:

- `api/openapi.client.yaml`
- `api/openapi.internal.yaml`

Do not treat empty or partial placeholders as published contracts.

## 4. Verification and review

Run the checks relevant to the change from the [AGENTS.md](../AGENTS.md) command table.

The API test suite currently needs Infisical bootstrap credentials. Report that limitation accurately.

Substantive changes need a fresh reviewer who did not implement them. The reviewer checks the diff, design alignment, failure behavior, tests, and documentation ownership.

**Exit gate:** checks pass, material findings are resolved, and the diff is reviewed.

## 5. Deployment

Deployment is a separate phase with its own authorization.

- Prepare the pull request with `.github/PULL_REQUEST_TEMPLATE.md`.
- Include verification evidence, risks, and rollback notes.
- Push, open or update a pull request, merge, and deploy only when the user has authorized that action.
- Completing implementation does not authorize deployment.

## Definition of done

- Acceptance criteria are met.
- Owning docs are current.
- Verification evidence is recorded.
- The diff is reviewed.
- The change is committed as a coherent unit.
- Remaining risks or deferred scope are stated.
