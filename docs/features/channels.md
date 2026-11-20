# Channels

A channel is a workspace deployment instance of a channel type such as WhatsApp, a chat widget, or a hosted page. Channel types and behavior live in code. The frontend maps each `channel_key` to localized type labels and descriptions. The database stores workspace channel instances, their user-provided names, optional single-agent assignments, and config.

> **Status:** Planned design. This page covers workspace channel instances and agent assignment only. Inbound and outbound channel behavior, messages, conversations, delivery state, webhooks, and transport adapters are not fully designed.

Agent configuration is owned by [Agents](agents.md); this page owns channel assignment.

## 1. Workflows

### Browse channels

- **Where:** Workspace settings, Channels.
- **Endpoint:** `GET /workspaces/{workspace_id}/channels?page=1&limit=20&search=`
- **Flow:**
  1. The frontend loads a paginated list of channel instances and renders them using its local channel type catalog.
  2. The API returns the instance name, `channel_key`, assigned agent, and configuration. The frontend maps the key to a localized type label and description.
- **Outcome:** The workspace channel list renders newest first. Multiple instances of the same type may appear. Types without a workspace instance appear only in the create picker.
- **Rules:**
  - Paginated with the shared defaults and maximum.
  - The frontend owns the channel type catalog and labels. The Backend does not expose a channel type discovery endpoint.

### Create a channel

- **Where:** Workspace settings, Channels, `Create channel`.
- **Endpoints:**
  - `GET /workspaces/{workspace_id}/agents?page=1&limit=20&search=`
  - `POST /workspaces/{workspace_id}/channels`
- **Flow:**
  1. The frontend presents channel types from its local catalog and maps each key to a localized label and description.
  2. The user chooses a type and enters a workspace instance name.
  3. The frontend loads workspace agents. The user selects one agent or leaves the channel unassigned.
  4. The user provides type-specific configuration.
  5. The Backend validates the type key against the code registry, unique name, agent membership, and configuration.
  6. The Backend creates a new channel instance.
- **Outcome:** The channel is created with zero or one assigned agent.
- **Errors:**
  - `404 NOT_FOUND`: the workspace or agent does not exist.
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
  - `409 DUPLICATE_NAME`: the instance name is already used in the workspace.
  - `422 VALIDATION_ERROR`: invalid agent or configuration.

## 2. Behavior

- A workspace may have multiple channel instances of the same type.
- Each channel has at most one operating agent. An agent may operate many channels.
- A channel may be created without an agent or become unassigned after its agent is deleted.
- Channel instance names are unique per workspace. The frontend owns the channel type catalog and localized labels.
- There is no channel type discovery endpoint. The Backend validates the submitted `channel_key` against the code registry.
- Channel configuration is opaque JSON validated by the channel type.
- Channel setup is not part of agent creation or editing.
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

- Channel type definitions live in code. The frontend owns the type catalog used for selection and localized labels.
- There is no channel type discovery endpoint.
- Database rows represent workspace channel instances. The instance `name` is user data.
- A workspace may have multiple instances of one channel type. The channel list is paginated.
- Each channel has at most one operating agent; an agent can operate multiple channels.
- Workspace channels have no separate active toggle.
- Channel setup is separate from agent creation and editing.
- Channel configuration is opaque to the agent configuration domain.
- Channel instance setup and agent assignment are in scope. Transport and conversation behavior are not fully designed.
