# Documentation Conventions

This page defines the structure and shared conventions for the repository docs.

## Shared conventions

| Concern | Rule |
|---|---|
| Naming | Client API JSON uses camelCase; AI Service contract payloads follow the contract. Database tables, columns, URL paths, and enums use snake_case. HTTP methods stay uppercase. |
| Payloads | The [API outline](../api/api-design-outline.md) holds the shared structure, formatting, and error rules. Detailed payloads will live in generated OpenAPI docs. |
| Schema | Tables and enums live in [schema.dbml](../database/schema.dbml). |
| Errors | Feature pages list workflow-specific errors. Generic `400 MALFORMED_REQUEST`, `401`, `403`, `429`, and `500` live in the API outline. |
| Repetition | Link to the owning section instead of repeating payload fields or shared rules. |
| Diagrams | Use Mermaid for state and cross-service sequences. |
| Labels | UI state labels use title case (`Ready`, `Processing`, `Failed`; `Enabled`, `Disabled`, `Unavailable`). API enum values use lowercase snake_case (`ready`, `processing`, `failed`). Say which form a field uses when both appear. |

## Workflows

Feature pages use flat workflow sections. Do not group them under Read, Mutation, or Lifecycle headings.

Each workflow uses:

| Field | Required | Purpose |
|---|---|---|
| `Where` | Yes | System area, not a specific control. |
| `Flow` | Yes | Numbered sequence, including each endpoint call where it happens. |
| `Errors` | When applicable | Workflow-specific errors only. |
| `Rules` | Optional | Cross-cutting behavior. |

Put client, Backend, and AI Service endpoint calls in the flow step that invokes them. Do not add separate `Endpoint` or `AI handoff` fields. Do not add a separate `Outcome` field; put a meaningful final state in the last flow step when it matters. Describe behavior between the frontend, Backend, and AI Service. Do not name buttons or other specific controls; use the component as the actor.

Use one `###` heading per workflow. Prefer 4 to 8 workflows per feature page. A workflow may describe a read, a mutation, or a background handoff; its behavior is clear from the heading and content.

## Page structure

1. Short feature introduction.
2. `## 1. Workflows`
3. A behavior, execution, or state section when useful.
4. `## N. Future work`
5. `## N. Decisions`

## Validation

Run `bash bin/check-backend-docs.sh` after editing these docs. It checks links, fences, flat workflow shape, the API outline, schema invariants, README presence, and stale structure assumptions. See [docs/README.md](../README.md) for the directory map.
