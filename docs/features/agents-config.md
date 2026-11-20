# Agents

An agent has instructions, assigned Workspace Actions, selected workspace sources, and resolved approval requirements. Channels are assigned separately; one agent can serve multiple channels.

## 1. Workflows

### Browse agents

- **Where:** Agents page.
- **Endpoint:** `GET /workspaces/{workspace_id}/agents?page=1&limit=20&search=`
- **Flow:**
  1. The page loads agent summaries.
  2. Each row shows the agent name, an instruction summary, and the assigned action count.
  3. Search matches the agent name.
- **Outcome:** The agent list renders.
- **Rules:**
  - Defaults: page 1, limit 20, with no search applied.
  - The instruction summary is the first 100 characters of Instructions, plus an ellipsis when longer.

### Create an agent

- **Where:** Agents page, `create Agent`.
- **Endpoints:**
  - `GET /workspaces/{workspace_id}/actions`
  - `GET /workspaces/{workspace_id}/knowledge`
  - `POST /workspaces/{workspace_id}/agents`
- **Flow:**
  1. **Basic information.** The user enters Agent name and Instructions. Both are required.
  2. **Assign Actions.** The user selects available Workspace Actions; unavailable actions remain visible but cannot be selected. Approval requirements come from workspace policy.
  3. **Configure Knowledge.** The user selects Ready sources from Workspace Knowledge. Processing and Failed sources are unavailable. Agents cannot create knowledge sources.
  4. **Review & save.** Review the summary, then choose `Save Agent`. The Backend:
     1. Validates the name, instructions, and selected sources. Every selected source must belong to the workspace and be ready.
     2. Creates the agent with its instructions, source assignments, and action grants.
     3. Returns `201 Created` with the agent.
- **Outcome:** The agent is created with its actions and selected sources. Actions and knowledge are optional. Channel setup is separate.
- **Rules:** Creation progress is not stored. Closing the browser discards the setup; the next attempt goes back to step 1.
- **Errors:**
  - `422 VALIDATION_ERROR`: a required field is missing or a selected action or source is invalid.
  - `409 DUPLICATE_NAME`: the name is already used in the workspace.

### View an agent

- **Where:** Agent detail.
- **Endpoint:** `GET /workspaces/{workspace_id}/agents/{agent_id}`
- **Flow:**
  1. The page loads the agent's instructions, assigned actions, and selected sources.
  2. `Edit Agent` changes agent details; `Edit assignments` changes action grants.
  3. Channel membership is shown in Channels settings, not on this page.
- **Outcome:** The agent summary, actions, and selected sources render.

### Edit basic information

- **Where:** Agent detail, `Edit Agent`.
- **Endpoint:** `PATCH /workspaces/{workspace_id}/agents/{agent_id}`
- **Flow:**
  1. The user changes Agent name or Instructions.
  2. The Backend validates and saves the partial update.
- **Outcome:** The next turn receives the new `agent_config`.
- **Errors:**
  - `409 DUPLICATE_NAME`: the new name is already used.
  - `422 VALIDATION_ERROR`: a required field is invalid.

### Edit assigned actions

- **Where:** Agent detail, Assigned Actions, `Edit assignments`.
- **Endpoints:**
  - `GET /workspaces/{workspace_id}/agents/{agent_id}/actions`
  - `PUT /workspaces/{workspace_id}/agents/{agent_id}/actions`
- **Flow:**
  1. The picker shows available Workspace Actions and current grants.
  2. The user selects the actions the agent may request; unavailable actions are disabled.
  3. Saving replaces editable grants and preserves stored grants for disabled or unavailable actions.
- **Outcome:** Action grants are stored. Approval requirements come from workspace policy.
- **Rules:**
  - Only workspace-enabled actions from connected integrations can be granted or changed.
  - Grants for disabled or unavailable actions are kept but cannot change until the action is available again.
  - Disabled and unavailable tools are omitted from the next `agent_config`.
  - Approval requirements come from workspace policy, not this picker.

### Configure agent knowledge

- **Where:** Agent detail, `Edit Agent`, Configure Knowledge.
- **Endpoints:**
  - `GET /workspaces/{workspace_id}/agents/{agent_id}/knowledge`
  - `PUT /workspaces/{workspace_id}/agents/{agent_id}/knowledge`
- **Flow:**
  1. The source picker lists workspace sources. Only Ready sources can be selected.
  2. The user selects the sources the agent may use.
  3. The Backend validates that every source belongs to the workspace and is Ready, then replaces the agent's assignments.
- **Outcome:** The agent retrieves only its selected workspace sources.
- **Errors:**
  - `422 VALIDATION_ERROR`: a selected source does not exist in this workspace or is not ready.

### Delete an agent

- **Where:** Agent detail, `Delete agent`.
- **Endpoint:** `DELETE /workspaces/{workspace_id}/agents/{agent_id}`
- **Flow:**
  1. The Backend removes the agent's source assignments. Workspace sources remain.
  2. The Backend hard-deletes the agent and its grants, conversations, executions, and approvals.
  3. Channel assignments are cleared; the channel records remain for reassignment.
- **Outcome:** The agent is removed and the UI returns to the agent list.

## 2. Turn configuration

The Backend sends the current `agent_config` with every turn and approval decision:

```jsonc
{
  "catalog_version": 5,
  "name": "Customer Experience",
  "instructions": {
    "role": "Help customers resolve order questions.",
    "language_constraints": "Follow the agent instructions and workspace policies.",
    "locale": "en",
    "response_format": "Concise and friendly.",
  },
  "tools": [
    { "tool_key": "vondera__get_product", "requires_approval": false },
    { "tool_key": "vondera__create_invoice", "requires_approval": true },
  ],
  "knowledge_source_ids": [101, 102],
}
```

The form captures Agent name and Instructions. The Backend sends Instructions as `instructions.role`. `language_constraints`, `locale`, and `response_format` use defaults because the form does not expose them. Tool approval flags come from workspace policy.

The AI Service stores no agent configuration. Edits apply to the next message. The Backend rechecks grants and integration connection status when a tool executes.

The AI Service retrieves only sources selected for the agent. It owns ingestion.

## 3. Future work

- Soft-delete/archive agents.
- Idempotency keys on agent creation.

## 4. Decisions

- Agent names are unique per workspace.
- The AI Service stores no agent configuration; the Backend sends it every turn.
- Channel assignment is separate from agent creation.
- Knowledge is selected from Workspace Knowledge and can change from the agent edit flow.
- Creation progress is not persisted.
- Hard deletion removes agent-owned records; channels remain and are unassigned.
- Only assigned workspace sources are retrieved.
