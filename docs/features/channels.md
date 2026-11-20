# Channels

A channel is a workspace deployment instance of a channel type such as WhatsApp, a chat widget, or a hosted page. Channel types and behavior live in code. The frontend maps each `channel_key` to localized type labels and descriptions. The database stores workspace channel instances, their user-provided names, optional single-agent assignments, and config.

> **Status:** Channel setup and agent assignment are in scope. Transport adapters, inbound and outbound messages, delivery status, webhooks, and conversation behavior are not complete.

## 1. Workflows

### Browse channels

- **Where:** Workspace settings, Channels.
- **Endpoint:** `GET /workspaces/{workspace_id}/channels`
- **Flow:**
  1. The frontend loads channel instances and enabled channel types from code.
  2. The API returns the instance name, `channel_key`, assigned agent, and configuration. The frontend maps the key to a localized type label and description.
  3. Unconfigured types show `Set up`.
- **Outcome:** The workspace channel list renders. Multiple instances of the same type may appear.

### Create a channel

- **Where:** Workspace settings, Channels, `Create channel`.
- **Endpoints:**
  - `GET /workspaces/{workspace_id}/channels/types`
  - `GET /workspaces/{workspace_id}/agents`
  - `POST /workspaces/{workspace_id}/channels`
- **Flow:**
  1. The frontend loads enabled channel keys from the code registry and maps them to localized type labels and descriptions.
  2. The user chooses a type and enters a workspace instance name.
  3. The frontend loads workspace agents. The user selects one agent or leaves the channel unassigned.
  4. The user provides type-specific configuration.
  5. The Backend validates the type, unique name, agent membership, and configuration.
  6. The Backend creates a new channel instance.
- **Outcome:** The channel is created with zero or one assigned agent.
- **Errors:**
  - `404 NOT_FOUND`: the workspace or agent does not exist.
  - `409 CHANNEL_DISABLED`: the channel type is disabled in the code registry.
  - `409 DUPLICATE_NAME`: the instance name is already used in the workspace.
  - `422 VALIDATION_ERROR`: invalid name, channel type, agent, or configuration.

### Edit a channel

- **Where:** Workspace settings, Channels, channel detail.
- **Endpoint:** `PATCH /workspaces/{workspace_id}/channels/{channel_id}`
- **Flow:**
  1. The user changes the channel name, assigns, changes, or clears the agent, or edits type-specific configuration.
  2. The Backend validates the workspace, channel, unique name, agent membership, and configuration.
  3. The Backend saves the partial update.
- **Outcome:** The channel keeps its identity and history while its assignment and configuration change.
- **Errors:**
  - `404 NOT_FOUND`: the workspace, channel, or agent does not exist.
  - `409 CHANNEL_DISABLED`: the channel type is disabled.
  - `409 DUPLICATE_NAME`: the instance name is already used in the workspace.
  - `422 VALIDATION_ERROR`: invalid agent or configuration.

## 2. Behavior

- A workspace may have multiple channel instances of the same type.
- Each channel has at most one operating agent. An agent may operate many channels.
- A channel may be created without an agent or become unassigned after its agent is deleted.
- Channel instance names are unique per workspace. Frontend localization provides type labels and descriptions.
- Channel configuration is opaque JSON validated by the channel type.
- Channel setup is not part of agent creation or editing.
- A disabled channel type cannot be configured and returns `409 CHANNEL_DISABLED`.
- Conversations belong to one channel instance and one agent.
- Deleting an agent leaves its channels unassigned; deleting a workspace cascades its channels.
- Message transport, webhooks, delivery state, and conversation lifecycle are incomplete.

## 3. Future work

- Channel transport adapters and webhook verification.
- Inbound and outbound message delivery, retries, and delivery status.
- Conversation lifecycle and sender metadata.
- Per-channel credentials and provider configuration.
- Channel archive and deletion.

## 4. Decisions

- Channel type definitions and enabled state live in code. Frontend localization owns type labels and descriptions.
- Database rows represent workspace channel instances. The instance `name` is user data.
- A workspace may have multiple instances of one channel type.
- Each channel has at most one operating agent; an agent can operate multiple channels.
- Workspace channels have no separate active toggle.
- Channel setup is separate from agent creation and editing.
- Channel configuration is opaque to the agent configuration domain.
- Channel setup is in scope and designed, but transport and conversation behavior are not complete.
