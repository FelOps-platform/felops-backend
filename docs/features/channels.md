# Channels

A channel is a workspace instance of a code-defined channel type.

> **Status:** Planned design. This page covers workspace channel instances and agent assignment only. Inbound and outbound channel behavior, messages, conversations, delivery state, webhooks, and transport adapters are not fully designed.

Agent configuration is owned by [Agents](agents.md); this page owns channel assignment.

## 1. Workflows

### Browse channels

- **Where:** Workspace settings, Channels.
- **Flow:**
  1. The frontend sends `GET /workspaces/{workspace_id}/channels?page=1&limit=20&search=` and loads a paginated list of channel instances.
  2. The Backend returns `channel_id`, `channel_type`, instance name, assigned agent, and configuration.
  3. The frontend renders the list from most to least recently created.

### Create a channel

- **Where:** Workspace settings, Channels.
- **Flow:**
  1. The frontend presents the available channel types.
  2. The user chooses a type and enters a workspace instance name.
  3. The frontend sends `GET /workspaces/{workspace_id}/agents?page=1&limit=20&search=` and loads workspace agents.
  4. The user selects one agent or leaves the channel unassigned.
  5. The user provides type-specific configuration.
  6. The frontend sends `POST /workspaces/{workspace_id}/channels` with `channel_type`, name, optional agent, and configuration.
  7. The Backend validates `channel_type` against the code registry, unique name, agent membership, and configuration, then creates the instance with a generated `channel_id`.
- **Errors:**
  - `404 NOT_FOUND`: the workspace or agent does not exist.
  - `409 DUPLICATE_NAME`: the instance name is already used in the workspace.
  - `422 VALIDATION_ERROR`: invalid name, channel type, agent, or configuration.

### Edit a channel

- **Where:** Workspace settings, Channels, channel detail.
- **Flow:**
  1. The user edits the channel name, agent assignment, or type-specific configuration.
  2. The frontend sends `PATCH /workspaces/{workspace_id}/channels/{channel_id}`.
  3. The Backend validates the workspace, channel, unique name, agent membership, and configuration.
  4. The Backend saves the partial update.
- **Errors:**
  - `404 NOT_FOUND`: the workspace, channel, or agent does not exist.
  - `409 DUPLICATE_NAME`: the instance name is already used in the workspace.
  - `422 VALIDATION_ERROR`: invalid agent or configuration.

## 2. Behavior

- A workspace may have multiple channel instances of the same type.
- Each channel has at most one assigned agent, and an agent may serve many channels.
- A channel may be created without an agent or become unassigned after its agent is deleted.
- Channel instance names are unique per workspace.
- Channel configuration is sent to the backend as JSON that varies depending on the type.
- Deleting an agent leaves its channels unassigned.
- Deleting a workspace cascades its channels.

## 3. Future work

- Per-channel credentials and provider configuration.
- Channel archive and deletion.

## 4. Decisions

- Channel type definitions live in code. The frontend owns the channel type catalog used for selection and localized labels.
- Channel setup is separate from agent creation and editing.
