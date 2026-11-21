# Agents

An agent combines instructions, actions, knowledge, and approval requirements.

> **Status:** Planned design. No API behavior is implemented unless source code proves otherwise.

Action availability is owned by [Actions](actions.md); source readiness by [Knowledge](knowledge.md); approval decisions by [Approvals](approvals.md).

## 1. Workflows

### Browse agents

- **Where:** Agents page.
- **Flow:**
  1. The frontend sends `GET /workspaces/{workspace_id}/agents?page=1&limit=20&search=` and loads agent summaries.
  2. Each summary shows the agent name, an instruction summary, and the assigned action count.
- **Rules:**
  - Defaults: page 1, limit 20, with no search applied.
  - The instruction summary is the first 100 characters of Instructions, plus an ellipsis when longer.

### Create an agent

- **Where:** Agents page.
- **Flow:**
  1. **Basic information.** The user enters Agent name and Instructions. Both are required.
  2. **Assign Actions.** The frontend sends `GET /workspaces/{workspace_id}/actions?page=1&limit=20&search=` and lists all workspace actions.
  3. The user selects actions. `Unavailable` actions stay visible but disabled. The frontend keeps the selected tool keys locally.
  4. **Configure Knowledge.** The frontend sends `GET /workspaces/{workspace_id}/knowledge?page=1&limit=20&search=&type=&status=` and lists all workspace sources.
  5. The user selects `Ready` sources. `Processing` and `Failed` sources stay visible but disabled. The frontend keeps the selected source IDs locally.
  6. **Review & save.** The frontend shows the selected action and source counts.
  7. The frontend sends `POST /workspaces/{workspace_id}/agents` with the reviewed agent data. The Backend:
     1. Validates the name, instructions, selected actions, and selected sources.
     2. Creates the agent with its instructions, source assignments, and action grants.
     3. Returns `201 Created` with the agent.
- **Rules:** Creation progress is not stored. Closing the browser discards the setup; the next attempt goes back to step 1.
- **Errors:**
  - `422 VALIDATION_ERROR`: a required field is missing or a selected action or source is invalid.
  - `409 DUPLICATE_NAME`: the name is already used in the workspace.

### View an agent

- **Where:** Agent detail.
- **Flow:**
  1. The frontend sends `GET /workspaces/{workspace_id}/agents/{agent_id}`.
  2. The response includes the agent's instructions, `assignedActions`, and `assignedSources`.
  3. Assigned sets are not paginated because they are expected to be small, unlike the workspace action and knowledge lists.
  4. Channel membership is shown in Channels settings, not on this page.

### Edit basic information

- **Where:** Agent detail.
- **Flow:**
  1. The user changes Agent name or Instructions.
  2. The frontend sends `PATCH /workspaces/{workspace_id}/agents/{agent_id}`.
  3. The Backend validates and saves the partial update.
- **Errors:**
  - `409 DUPLICATE_NAME`: the new name is already used.
  - `422 VALIDATION_ERROR`: a required field is invalid.

### Edit assigned actions

- **Where:** Agent detail, Assigned Actions.
- **Flow:**
  1. The agent detail response includes `assignedActions` without pagination.
  2. The frontend uses each action's `toolKey` as the selected key.
  3. The frontend sends `GET /workspaces/{workspace_id}/actions?page=1&limit=20&search=&integration_key=&availability=`.
  4. The frontend renders one flat list of workspace actions. Rows matching an assigned `toolKey` are checked, not duplicated.
  5. The user selects the actions the agent may request.
  6. The frontend sends `PUT /workspaces/{workspace_id}/agents/{agent_id}/actions` with the full `toolKeys` set.
  7. The Backend returns the final assigned actions.
- **Errors:**
  - `404 NOT_FOUND`: the workspace or agent does not exist.
  - `422 VALIDATION_ERROR`: a selected action is invalid or unavailable.

### Configure agent knowledge

- **Where:** Agent detail, Configure Knowledge.
- **Flow:**
  1. The agent detail response includes `assignedSources` without pagination.
  2. The frontend uses each source's `id` as the assigned source ID.
  3. The frontend sends `GET /workspaces/{workspace_id}/knowledge?page=1&limit=20&search=&type=&status=`.
  4. The frontend renders one flat list of workspace sources. Rows matching an assigned source ID are checked, not duplicated.
  5. The user selects sources.
  6. The frontend sends `PUT /workspaces/{workspace_id}/agents/{agent_id}/knowledge` with the full `sourceIds` set.
  7. The Backend returns the final assigned sources.
- **Errors:**
  - `404 NOT_FOUND`: the workspace or agent does not exist.
  - `422 VALIDATION_ERROR`: a selected source does not exist in this workspace or is not ready.

### Delete an agent

- **Where:** Agent detail.
- **Flow:**
  1. The frontend sends `DELETE /workspaces/{workspace_id}/agents/{agent_id}`.
  2. The Backend removes the agent's source assignments. Workspace sources remain.
  3. The Backend hard-deletes the agent and its grants, conversations, executions, and approvals.
  4. Channel assignments are cleared; the channel records remain for reassignment.

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

The Backend sends Instructions as `instructions.role`. `language_constraints`, `locale`, and `response_format` use defaults because the creation form does not expose them. Tool approval flags come from workspace policy.

The AI Service stores no agent configuration. Edits apply to the next message. The Backend rechecks grants and integration connection status when a tool executes.

The AI Service retrieves only sources assigned to the agent. It owns ingestion.

## 3. Future work

- Soft-delete/archive agents.
- Idempotency keys on agent creation.

## 4. Decisions

- There is no assignment cap in the MVP.
