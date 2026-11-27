# API Design Outline

This outline keeps only API organization, shared formatting, and common error rules. Database design and high-level feature docs come first. After implementation, low-level request and response details are generated into `openapi.client.yaml` and `openapi.internal.yaml` for other developers.

## 1. Surfaces

| Surface          | Base             | Auth                               | Notes                                         |
| ---------------- | ---------------- | ---------------------------------- | --------------------------------------------- |
| Client API       | `/api/v1`        | User access token + refresh cookie | Workspace routes require membership.          |
| Backend internal | `/internal`      | AI identity token                  | Called by the AI Service.                     |
| AI Service       | Separate service | Backend identity token             | Defined by the AI Service contract.           |
| AI webhooks      | `/webhooks/ai`   | AI identity token                  | Message, approval, ingestion, and job events. |

`GET /api/v1/health` is public. The OAuth callback is public but bound to a one-time state record. Workspace routes require a user access token; workspace access is checked per request. Auth routes follow their own flow. Workspace access rules are owned by the future workspace design; non-members receive `404 NOT_FOUND`.

## 2. Resource groups

The frontend presents Integrations and Actions as two views of one page. They remain separate API resources.

Definitions for integrations, built-in actions, and channel types live in code. The database stores workspace state only: OAuth state, connections, action settings, grants, executions, channels, and configuration.

| Group | Main resources | Representative endpoints |
| --- | --- | --- |
| Health | service health | `GET /api/v1/health` |
| Auth | user | `POST /api/v1/auth/sign-up`, `POST /api/v1/auth/verify-email`, `POST /api/v1/auth/resend-verification`, `POST /api/v1/auth/sign-in`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/sign-out`, `GET /api/v1/auth/me`, `POST /api/v1/auth/password-reset/request`, `POST /api/v1/auth/password-reset/verify`, `POST /api/v1/auth/password-reset/confirm` |
| Workspaces | workspace | `GET /api/v1/workspaces`, `POST /api/v1/workspaces`, `GET /api/v1/workspaces/{workspace_id}` |
| Integrations | integration, connection, OAuth flow | `GET .../integrations/{integration_key}`, `POST .../oauth/start`, `GET /api/v1/integrations/oauth/callback` |
| Actions | action, catalog, workspace setting | `GET .../actions`, `GET .../actions/{tool_key}`, `PUT .../actions/{tool_key}/availability`, agent grants |
| Knowledge | source, ingestion | `GET/POST /workspaces/{workspace_id}/knowledge`, `GET/DELETE .../knowledge/{source_id}`, `POST .../knowledge/{source_id}/retry` |
| Channels | channel instance, agent assignment | `GET/POST /workspaces/{workspace_id}/channels`, `GET/PATCH .../channels/{channel_id}` |
| Agents | agent, knowledge selection, action grant | agent CRUD, knowledge selection, action grants |
| Executions | execution | workspace and agent execution history |
| Approvals | approval | agent approval list, decision |
| Internal | tool call, catalog, webhook | `POST /internal/.../tools/call`, `GET /internal/catalog`, `POST /webhooks/ai` |

Client conversation and message APIs are outside this outline; conversation IDs still appear in execution and approval records.

### Auth rules

- Sign-up, verify-email, resend-verification, sign-in, password-reset request, password-reset verify, and password-reset confirm are public. Refresh and sign-out use the refresh cookie. `GET /api/v1/auth/me` requires the user access token.
- The access token travels in `Authorization: Bearer`. The refresh token is an HttpOnly, Secure, SameSite=None cookie scoped to `/api/v1/auth` (SameSite=Lax when running over local HTTP).
- The access token appears only in sign-in, verification, and refresh responses. Refresh tokens and auth codes never appear in JSON responses, URLs, logs, or browser storage. Refresh tokens are hashed at rest and rotated on every refresh.
- The refresh token embeds a session identifier; only the secret hash is stored, so a stale token outside a brief concurrent-refresh grace window revokes its session.
- Sign-up returns `202` for new or existing unverified accounts without changing existing credentials, or returns `409 EMAIL_ALREADY_EXISTS` for verified accounts. Resend and password-reset request return `202` on accepted requests, `404 NOT_FOUND` (`[{ resource: "user" }]`) for unknown emails, `409 EMAIL_ALREADY_VERIFIED` if already verified on resend, and `429 RATE_LIMITED` when a rate limit is exceeded. If the verification or reset email cannot be sent, the response is `503 UPSTREAM_UNAVAILABLE` with `details: [{ service: "email" }]`; the code remains persisted and retrying reissues it.
- Sign-up, resend, and reset requests are rate-limited per client IP by the route middleware.
- Sign-in returns a generic `401 INVALID_CREDENTIALS`. Correct credentials for an unverified email return `403 EMAIL_NOT_VERIFIED`.
- Refresh and sign-out use the refresh cookie. Cookie-authenticated requests from an Origin outside `CORS_ORIGINS` return `403 FORBIDDEN`. A refresh-token mismatch outside the grace window revokes the session and returns `401 SESSION_EXPIRED`. Sign-out clears the cookie and returns `204` idempotently.
- Password-reset confirmation validates password strength first (via `VALIDATION_ERROR` details), sets `is_verified = true`, and revokes all sessions for the user. Revocation stops refresh immediately; an access token already issued remains valid until it expires.
- Passwords use Argon2id and require at least 12 characters (`422 VALIDATION_ERROR` with field details when shorter).
- Verification and reset codes are 6 digits, hashed with HMAC-SHA-256 and a server pepper, expire after 10 minutes, allow 5 attempts, and are single-use; expiry errors fire only after a matching code hash.
- Rate limits apply to sign-up, sign-in, resend, and password reset.
- Auth-specific errors: `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `EMAIL_ALREADY_EXISTS`, `EMAIL_ALREADY_VERIFIED`, `INVALID_VERIFICATION_CODE`, `VERIFICATION_CODE_EXPIRED`, `INVALID_RESET_CODE`, `RESET_CODE_EXPIRED`, `SESSION_EXPIRED`, `RATE_LIMITED`.
- Workspace resources for non-members return `404 NOT_FOUND`. `403 FORBIDDEN` is reserved for future role restrictions when membership is modeled.

## 3. Formatting

- Client API JSON keys are camelCase. Paths, query parameters, tables, columns, and enums are snake_case.
- AI Service payloads follow the contract's field casing (`agent_config` and `tool_key` in turns, `toolKey` and `integrationKey` in tool calls). Do not apply the client casing rule to service payloads.
- Client responses use `{ "data": ... }`. Paginated lists add `meta: { page, limit, total, totalPages }`.
- Pagination defaults: `page=1`, `limit=20`, maximum `100`.
- `201` returns the created resource, `202` returns the accepted job or source identifier when one exists (or empty `202` for accepted auth code/email actions), and `204` has no body.
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
- `503 UPSTREAM_UNAVAILABLE` details use `{ service: "storage" | "ai_service" | "email" }`.
- `PATCH` returns `204` unless the server transforms values the client must see.
- Timestamps are ISO 8601 UTC. IDs are numeric unless a resource uses a UUID/string ID, such as approvals and jobs.
- Stable slugs use `*_key` and API tool identity uses `toolKey`. Integration keys and tool keys are the stable identifiers across the code registry and database rows.
- The Backend returns stable keys and user-owned text only. Frontend localization owns static labels, descriptions, and category labels for integrations, actions, and channel types. Action descriptions in the catalog are LLM-facing and are not returned for display.
- Action catalog responses include `catalogVersion`. If the frontend receives an unknown `tool_key`, show the key with an update-required state, preserve existing grants, and block new assignment until localization is updated. Release checks must cover every built-in tool key.

### Pagination policy

- Paginate collections that grow with user activity or history: workspace knowledge, workspace actions, executions, approvals, and channels.
- The agents list is already paginated.
- Do not paginate bounded code registries or small fixed sets: integrations and single-resource detail endpoints.
- Use `page`, `limit`, and relevant `search` or filter parameters. Default `limit=20`; maximum `100`.
- Keep aggregate statistics separate from paginated rows. Do not calculate action or knowledge statistics by loading every page.
- Agent detail returns all assigned actions and sources without pagination. There is no assignment cap in the MVP. Workspace lists remain paginated.

## 4. Common status codes

| Status | Code                                    | Use                                                      |
| ------ | --------------------------------------- | -------------------------------------------------------- |
| `400`  | `MALFORMED_REQUEST`                     | JSON body cannot be parsed.                              |
| `401`  | `UNAUTHENTICATED` or auth-specific      | Missing or invalid credential.                           |
| `403`  | `FORBIDDEN` or auth-specific            | Authenticated without required access, or auth-specific account state. |
| `404`  | `NOT_FOUND`                             | Workspace or resource missing.                           |
| `409`  | resource-specific                       | Duplicate, already decided, or invalid state transition. |
| `413`  | `PAYLOAD_TOO_LARGE`                     | Upload or response cap exceeded.                         |
| `422`  | `VALIDATION_ERROR` or resource-specific | Semantically invalid input or unavailable action/tool.   |
| `429`  | `RATE_LIMITED`                          | Client rate limit.                                       |
| `500`  | `INTERNAL_ERROR`                        | Unexpected failure.                                      |
| `502`  | `UPSTREAM_INVALID_RESPONSE`             | Upstream returned an unusable response.                  |
| `503`  | `UPSTREAM_UNAVAILABLE`                  | Storage, AI, or other external Service unavailable.      |

Auth uses `401 INVALID_CREDENTIALS`, `401 SESSION_EXPIRED`, and `403 EMAIL_NOT_VERIFIED` as resource-specific 401/403 codes.

`details.resource` values: `user`, `workspace`, `integration`, `connection`, `action`, `agent`, `knowledge_source`, `channel`, `execution`, `approval`, `conversation`.

## 5. Channel rules

- `GET /workspaces/{workspace_id}/channels?page=1&limit=20&search=`
- `POST /workspaces/{workspace_id}/channels`
- `GET/PATCH /workspaces/{workspace_id}/channels/{channel_id}`
- A workspace may have multiple channel instances of the same `channel_type`.
- Each channel has at most one agent. A channel may be created unassigned, and an agent may serve multiple channels.
- Each channel has a Backend-generated numeric `channel_id`. The client submits `channel_type`, name, optional agent, and configuration on create.
- Names are unique per workspace.
- Channel type definitions live in code; the database stores workspace instances only.
- The frontend owns the channel type catalog and maps `channel_type` to localized labels and descriptions. There is no channel type discovery endpoint; the Backend validates the submitted `channel_type`.
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
- Agent action grants carry `requiresApproval` resolved from workspace policy. Policy configuration is outside this outline; the action assignment flow does not edit approval flags.
- The Backend sends `agent_config` on every AI turn and approval decision, including selected workspace source IDs. The AI Service does not store it.
- Agent action grants reference `tool_key` values from the code catalog. The frontend maps tool keys and integration keys to localized display text.
- Agent detail returns full `assignedActions` and `assignedSources` for display and assignment state.
- The action assignment flow loads the paginated workspace actions list, marks rows from agent detail's assigned actions, and does not append duplicate assigned rows. During creation, it uses the same workspace list and keeps selections locally.
- Action assignment `PUT` accepts `{ "toolKeys": [...] }`, validates newly selected actions, preserves locked grants, and returns the final assigned actions.
- Agent grants are kept when a workspace action is disabled or unavailable. Disabled and unavailable tools are omitted from `agent_config`.

## 8. Knowledge rules

- Workspace Knowledge is the only source library. There are no agent-specific sources or uploads.
- Sources are stored once per workspace and deduplicated by content hash within it. A source can be assigned to multiple agents.
- Duplicate content returns `409 DUPLICATE_SOURCE` with `details` identifying the existing source. Do not create a source, ingest again, or overwrite existing metadata.
- Agent detail returns `assignedSources`. The knowledge assignment flow loads the paginated workspace knowledge list, marks rows from agent detail's assigned sources, and does not append duplicate assigned sources. Processing and Failed sources remain visible; existing non-ready assignments are locked.
- Agent knowledge `PUT` accepts `{ "sourceIds": [...] }`, validates that every newly selected source belongs to the workspace and is ready, preserves non-ready assignments, and returns the final assigned sources. During creation, use the workspace knowledge list and keep selections locally.
- Source types: PDF, DOCX, Plaintext (TXT), and Website URL.
- API source fields: `name`, optional `description`, `type`, `availability`, `date`, and `assignedAgentsCount`. `type` is `pdf | docx | txt | url`; storage splits URL sources from file subtypes. Name and description belong to the workspace source.
- Availability: `ready | processing | failed`.
- Assigning a source does not copy or re-ingest it.
- Deleting a source purges its vectors before removing the source and its assignments. If the AI Service is unavailable, return `503 UPSTREAM_UNAVAILABLE` and keep the source.

## 9. OAuth integration rules

- Start returns the provider authorization URL. The Backend validates workspace membership and the integration key.
- The OAuth callback is public and state-bound. The Backend handles the provider response and redirects to the frontend with a safe result.
- Provider tokens stay in the Backend and never appear in frontend URLs, browser storage, or logs.
- A failed connection marks the integration `invalid` and requires reconnecting.
- Provider-specific OAuth details live in the provider adapter.

## 10. OpenAPI generation notes

When generating the detailed specs after implementation:

- Reuse `Error`, `ValidationDetail`, `NotFoundDetail`, `UpstreamDetail`, `Meta`, and pagination envelopes.
- Reuse security schemes: `userAccessToken` (bearer), `refreshToken` (cookie), `AI_IDENTITY_TOKEN`, and `BACKEND_IDENTITY_TOKEN`.
- Auth routes are public except refresh and sign-out, which use the `refreshToken` cookie. Do not generate the OpenAPI YAML in this design pass.
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
