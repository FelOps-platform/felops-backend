# API Design Outline

This outline keeps only API organization, shared formatting, and common error rules. Database design and high-level feature docs come first. After implementation, low-level request and response details are generated into `openapi.client.yaml` and `openapi.internal.yaml` for other developers.

## 1. Surfaces

| Surface          | Base             | Auth                   | Notes                                         |
| ---------------- | ---------------- | ---------------------- | --------------------------------------------- |
| Client API       | `/api/v1`        | User JWT               | Workspace membership required.                |
| Backend internal | `/internal`      | AI identity token      | Called by the AI Service.                     |
| AI Service       | Separate service | Backend identity token | Defined by the AI Service contract.           |
| AI webhooks      | `/webhooks/ai`   | AI identity token      | Message, approval, ingestion, and job events. |

`GET /api/v1/health` is public. The OAuth callback is public but bound to a one-time state record. Workspace routes require a workspace-scoped user token; auth routes follow their own flow.

## 2. Resource groups

The UI presents Integrations and Actions as two tabs of one page. They remain separate API resources.

Definitions for integrations, built-in actions, and channel types live in code. The database stores workspace state only: OAuth state and pending selections, connections, action settings, grants, executions, channels, and configuration.

| Group | Main resources | Representative endpoints |
| --- | --- | --- |
| Health | service health | `GET /api/v1/health` |
| Auth / workspace | user, workspace, member | auth and workspace settings |
| Integrations | integration, connection, OAuth flow | `GET .../integrations/{integration_key}`, `POST .../oauth/start`, `GET /api/v1/integrations/oauth/callback`, `POST .../oauth/complete` |
| Actions | action, catalog, workspace setting | `GET .../actions`, `GET .../actions/{tool_key}`, `PUT .../actions/{tool_key}/availability`, agent grants |
| Knowledge | source, ingestion | `GET/POST /workspaces/{workspace_id}/knowledge`, `GET/DELETE .../knowledge/{source_id}`, `POST .../knowledge/{source_id}/retry` |
| Channels | channel instance, agent assignment | `GET/POST /workspaces/{workspace_id}/channels`, `GET/PATCH .../channels/{channel_id}` |
| Agents | agent, knowledge selection, action grant | agent CRUD, knowledge selection, action grants |
| Executions | execution | workspace and agent execution history |
| Approvals | approval | agent approval list, decision |
| Internal | tool call, catalog, webhook | `POST /internal/.../tools/call`, `GET /internal/catalog`, `POST /webhooks/ai` |

Client conversation and message APIs are outside this outline; conversation IDs still appear in execution and approval records.

## 3. Formatting

- Client API JSON keys are camelCase. Paths, query parameters, tables, columns, and enums are snake_case.
- AI Service payloads follow the contract's field casing (`agent_config` and `tool_key` in turns, `toolKey` and `integrationKey` in tool calls). Do not apply the client casing rule to service payloads.
- Client responses use `{ "data": ... }`. Paginated lists add `meta: { page, limit, total, totalPages }`.
- Pagination defaults: `page=1`, `limit=20`, maximum `100`.
- `201` returns the created resource, `202` returns the accepted job or source identifier, and `204` has no body.
- Errors use:
  ```jsonc
  {
    "error": {
      "code": "UPPER_SNAKE_CASE",
      "details": [], // optional
    },
  }
  ```
- `404 NOT_FOUND` uses `details: [{ "resource": "..." }]`; never invent a placeholder ID.
- `422 VALIDATION_ERROR` details use `{ field, code, params? }`.
- `503 UPSTREAM_UNAVAILABLE` details use `{ service: "storage" | "ai_service" }`.
- `PATCH` returns `204` unless the server transforms values the client must see.
- Timestamps are ISO 8601 UTC. IDs are numeric unless a resource uses a UUID/string ID, such as approvals, jobs, and OAuth pending connections.
- Stable slugs use `*_key` and API tool identity uses `toolKey`. Integration keys and tool keys are the stable identifiers across the code registry and database rows.
- The Backend returns stable keys and user-owned text only. Frontend localization owns static labels, descriptions, and category labels for integrations, actions, and channel types. Action descriptions in the catalog are LLM-facing and are not returned for display.
- Action catalog responses include `catalogVersion`. If the frontend receives an unknown `tool_key`, show the key with an update-required state, preserve existing grants, and block new assignment until localization is updated. Release checks must cover every built-in tool key.

### Pagination policy

- Paginate collections that grow with user activity or history: workspace knowledge, workspace actions, agent actions, agent knowledge, executions, approvals, and channels.
- The agents list is already paginated.
- Do not paginate bounded code registries or small fixed sets: integrations, OAuth accounts, and single-resource detail endpoints.
- Use `page`, `limit`, and relevant `search` or filter parameters. Default `limit=20`; maximum `100`.
- Keep aggregate statistics separate from paginated rows. Do not calculate action or knowledge statistics by loading every page.
- For agent action and knowledge pickers, return the current selected IDs separately from the paginated available items.

## 4. Common status codes

| Status | Code                                    | Use                                                      |
| ------ | --------------------------------------- | -------------------------------------------------------- |
| `400`  | `MALFORMED_REQUEST`                     | JSON body cannot be parsed.                              |
| `401`  | `UNAUTHENTICATED`                       | Missing or invalid credential.                           |
| `403`  | `FORBIDDEN`                             | Authenticated without required access.                   |
| `404`  | `NOT_FOUND`                             | Workspace or resource missing.                           |
| `409`  | resource-specific                       | Duplicate, already decided, or invalid state transition. |
| `410`  | `PENDING_EXPIRED`                       | The OAuth pending connection expired.                    |
| `413`  | `PAYLOAD_TOO_LARGE`                     | Upload or response cap exceeded.                         |
| `422`  | `VALIDATION_ERROR` or resource-specific | Semantically invalid input or unavailable action/tool.   |
| `429`  | `RATE_LIMITED`                          | Client rate limit.                                       |
| `500`  | `INTERNAL_ERROR`                        | Unexpected failure.                                      |
| `502`  | `UPSTREAM_INVALID_RESPONSE`             | Upstream returned an unusable response.                  |
| `503`  | `UPSTREAM_UNAVAILABLE`                  | Storage, AI, or other external Service unavailable.      |

`details.resource` values: `workspace`, `integration`, `connection`, `oauth_pending_connection`, `action`, `agent`, `knowledge_source`, `channel`, `execution`, `approval`, `conversation`.

## 5. Channel rules

- `GET /workspaces/{workspace_id}/channels?page=1&limit=20&search=`
- `POST /workspaces/{workspace_id}/channels`
- `GET/PATCH /workspaces/{workspace_id}/channels/{channel_id}`
- A workspace may have multiple channel instances of the same `channel_key`.
- Each channel has at most one agent. A channel may be created unassigned, and an agent may operate multiple channels.
- A channel instance has a workspace-specific user-provided `name`; names are unique per workspace.
- Channel type definitions live in code; the database stores workspace instances only.
- The frontend owns the channel type catalog and maps `channel_key` to localized labels and descriptions. There is no channel type discovery endpoint; the Backend validates the submitted key.
- Duplicate channel names return `409 DUPLICATE_NAME`.
- Channel setup is separate from agent creation and editing.
- Transport, messages, delivery state, and conversations are not complete.

## 6. Action availability rules

- `GET /workspaces/{workspace_id}/actions?page=1&limit=20&search=&integration_key=&availability=` lists actions for workspace integrations with a connection record, including invalid connections.
- Actions from integrations the workspace has never connected are not listed.
- `PUT /workspaces/{workspace_id}/actions/{tool_key}/availability` sets `{ enabled: boolean }`.
- Workspace action settings are sparse. No row means enabled.
- `Enabled`: connection healthy and no disabling override.
- `Disabled`: workspace override is `enabled = false`.
- `Unavailable`: the integration connection is invalid and must be reconnected.
- Disabled and unavailable tools are omitted from `agent_config`.
- Disabling an action keeps agent grants. Invalid credentials also keep grants and settings.
- Explicit integration disconnect removes workspace action settings and agent grants.
- Enabling an unavailable action returns `409 ACTION_UNAVAILABLE`.

## 7. Agent rules

- Creation steps: Basic information → Assign Actions → Configure Knowledge → Review & save.
- Creation fields: name and instructions. The list shows an instruction summary.
- Knowledge is configured in step 3 and can be edited later. Agents select workspace sources only; they cannot upload their own.
- Channels are configured separately.
- Agent action grants carry `requiresApproval` resolved from workspace policy. Policy configuration is outside this outline; the action picker does not edit approval flags.
- The Backend sends `agent_config` on every AI turn and approval decision, including selected workspace source IDs. The AI Service does not store it.
- Agent action grants reference `tool_key` values from the code catalog. The frontend maps tool keys and integration keys to localized display text.
- Agent grants are kept when a workspace action is disabled or unavailable. Disabled and unavailable tools are omitted from `agent_config`.

## 8. Knowledge rules

- Workspace Knowledge is the only source library. There are no agent-specific sources or uploads.
- Sources are stored once per workspace and deduplicated by content hash within it. A source can be assigned to multiple agents.
- Agent knowledge `PUT` replaces selected assignments after validating that every source belongs to the workspace and is ready.
- Source types: PDF, DOCX, Plaintext (TXT), and Website URL.
- API source fields: `name`, optional `description`, `type`, `availability`, `date`, and `assignedAgentsCount`. `type` is `pdf | docx | txt | url`; storage splits URL sources from file subtypes. Name and description belong to the workspace source.
- Availability: `ready | processing | failed`.
- Assigning a source does not copy or re-ingest it.
- Deleting a source purges its vectors before removing the source and its assignments. If the AI Service is unavailable, return `503 UPSTREAM_UNAVAILABLE` and keep the source.

## 9. OAuth integration rules

- Start returns the provider authorization URL. The Backend validates workspace membership and the integration key.
- Store only a SHA-256 hash of the one-time state with workspace, integration, initiator, callback URI, return path, and a 10 minute expiry.
- The OAuth callback is public and state-bound. It exchanges the code server-side and redirects to the frontend with a safe result.
- Provider tokens stay in the Backend, encrypted with AES-256-GCM.
- A provider with multiple accessible accounts uses a 10 minute pending connection and explicit account selection.
- Refresh rotating tokens under a row lock. A failed refresh marks the connection `invalid`.
- The provider profile in code defines endpoints, scopes, client credentials, account discovery, API base URL, token endpoint authentication, and refresh behavior.
- The redirect URI sent at authorization must exactly match the value sent at token exchange and registered with the provider.
- Tokens never appear in frontend URLs, browser storage, or logs.

## 10. OpenAPI generation notes

When generating the detailed specs after implementation:

- Reuse `Error`, `ValidationDetail`, `NotFoundDetail`, `UpstreamDetail`, `Meta`, and pagination envelopes.
- Reuse security schemes: user bearer JWT, `AI_IDENTITY_TOKEN`, `BACKEND_IDENTITY_TOKEN`.
- Group tags by resource, not by read/mutation workflow.
- Define list, create, detail, patch, delete, and action subresources explicitly.
- Attach the common error table to every operation through reusable responses, then add workflow-specific errors.
- Agent creation returns `201` after linking selected workspace sources. Source ingestion status is reported by the workspace knowledge endpoints, not by agent creation.
- Keep AI Service endpoints in the AI Service contract, not in the Backend client spec.
- Backend internal and webhook spec covers only `tools/call`, catalog pull, and AI webhooks.
- Use complete request/response examples; create resources with `201`, accepted async work with `202`, deletes with `204`.
- Validate generated specs before publishing.

## 11. Deferred scope

- Custom HTTP actions, including create, request builder, test, edit, and delete flows.
- Custom-action credentials, URL validation, and request templating.
