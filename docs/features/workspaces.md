# Workspaces

Workspaces are the top-level tenant containers for agents, integrations, actions, knowledge sources, channels, and conversations.

The [API outline](../api/api-design-outline.md) owns shared response envelopes, status codes, and error rules. The [database guide](../database/database.md) explains workspace ownership; [schema.dbml](../database/schema.dbml) holds the canonical definitions.

## 1. Workflows

### List user workspaces

- **Where:** Select a workspace screen after authentication.
- **Flow:**
  1. The frontend sends `GET /api/v1/workspaces` with the user access token.
  2. The Backend queries workspaces owned by the authenticated user along with each workspace's agent count.
  3. The Backend returns `200` with `{ data: [{ id, name, role, agentsCount, createdAt }] }`. An empty array indicates the user has no accessible workspace yet.
- **Rules:**
  - Until multi-user membership is modeled, `workspaces.owner_id` is the only user-to-workspace relationship and `role` is `"owner"`.

### Create workspace

- **Where:** Create your workspace screen.
- **Flow:**
  1. The user submits a workspace name (1 to 50 characters, trimmed).
  2. The frontend sends `POST /api/v1/workspaces` with `{ name }` and the user access token.
  3. The Backend inserts the workspace with `owner_id` set to the authenticated user and returns `201` with `{ data: { id, name, role: "owner", agentsCount: 0, createdAt } }`.
- **Errors:**
  - `409 WORKSPACE_LIMIT_REACHED`: the user already owns the maximum of 10 workspaces.
  - `422 VALIDATION_ERROR`: `name` is missing, empty after trimming, or longer than 50 characters.
- **Rules:**
  - Each user may own at most 10 workspaces (`GET /api/v1/workspaces` remains unpaginated).

### Get workspace detail

- **Where:** Protected workspace entry and access verification.
- **Flow:**
  1. The frontend sends `GET /api/v1/workspaces/{workspace_id}` with the user access token.
  2. The Backend looks up the workspace scoped to `owner_id = authenticated user` along with its agent count.
  3. When found, the Backend returns `200` with `{ data: { id, name, role: "owner", agentsCount, createdAt } }`.
  4. When missing or owned by another user, the Backend returns `404 NOT_FOUND` with `details: [{ resource: "workspace" }]`.
- **Errors:**
  - `404 NOT_FOUND`: the workspace does not exist or the authenticated user is not its owner.
  - `422 VALIDATION_ERROR`: `workspace_id` is not a positive integer.

## 2. Future work

- Multi-user workspace membership, invitations, roles, and member management.
- Workspace renaming, settings, and deletion.

## 3. Decisions

No ADR; this section records the rationale.

- **Owner-only access in MVP.** Matches the current `workspaces.owner_id` schema without introducing membership tables prematurely; non-owners receive `404 NOT_FOUND` per the API outline.
