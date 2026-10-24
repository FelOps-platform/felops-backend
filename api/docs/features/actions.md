# Actions

**Status: Proposed.** This document describes intended product behavior. The
current API implements only `GET /api/v1/health`; action routes and execution
history are not implemented.

## Workflows

### Viewing workspace actions

1. The user opens the actions page.
2. The frontend requests available actions from the backend.
3. The backend returns actions for integrations connected to the workspace,
   grouped by integration. Each action includes its name and description.
4. The frontend displays the groups and lets the user filter by integration or
   search by name.

### Viewing and configuring an agent's allowed actions

1. The user opens the actions page for an agent.
2. The frontend requests that agent's allowed actions.
3. The backend returns the connected integrations' actions, grouped by
   integration. Each action includes its name and description.
4. The frontend displays the groups and lets the user filter by integration or
   search by name.
5. The user selects actions to allow for the agent; the frontend sends the
   selection and the backend updates the agent's allowed actions.
6. The proposal also lets the user mark an allowed action as requiring approval.
   Approval-dependent execution is outside Sprint 1 because the Approval
   Service is excluded; the Sprint 1 path must use an action that does not
   require approval.

### Viewing execution history

1. The user opens workspace or agent execution history.
2. The frontend requests executed actions for the selected scope.
3. The backend returns the proposed history fields:
   - Workspace view: action name, integration name, agent name, and timestamp.
   - Agent view: action name, integration name, initiator (user or automatic
     agent), and timestamp.
4. The frontend displays the results in a table.

## Failure cases awaiting contract design

The happy paths above are proposals, not complete workflow designs. Define the
user-visible errors, retry behavior, and cleanup in the Apidog contract phase:

- **F1 — Viewing actions, steps 2–3; configuring actions, step 5:** reject an
  unauthorized request or a workspace/agent mismatch; specify the error
  response without disclosing another workspace's actions.
- **F2 — Configuring allowed actions, step 5:** decide the response and cleanup
  when validation or persistence fails, so a retry cannot leave a partial
  action selection unnoticed.
- **F3 — Viewing execution history, steps 2–3:** distinguish an empty history
  from a failed lookup and define the response for each.

These cases need design before the corresponding endpoints are implemented.

## Contract and schema references

- Keep the proposed action data model and open decisions in the canonical
  [Database](../database.md).
- Keep the proposed system flow and the Backend/MCP responsibility boundary in
  [Architecture](../architecture.md).
- Design API endpoints, request/response examples, and mocks in Apidog after the
  pending database revision and workspace invitation. No endpoint contract is
  defined here; server implementation follows that design. See
  [Product Workflow](../workflow.md).

## Future work

- Creating custom actions.
