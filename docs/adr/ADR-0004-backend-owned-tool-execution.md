# ADR-0004: Backend owns tool definitions and execution

Status: Accepted (approval/turn mechanics amended by ADR-0005; catalog storage superseded by ADR-0006)
Date: 2026-10-25
Deciders: FelOps backend team
Area: architecture, data, security, integrations

> **Amendment (ADR-0005):** The Backend-owned catalog and execution decision remains current. The turn, approval, resume, and retry mechanics described below are historical. Current behavior sends `agent_config.tools` with tool keys and approval flags, receives approval requests through `approval.required`, and executes only through `tools/call`.
>
> **Scope note:** Custom actions are deferred and not part of current scope. ADR-0006 also supersedes the database-backed catalog storage described below. References below are historical context.

## Context

[ADR-0003](ADR-0003-database-backed-built-in-tool-definitions.md) made the `actions` table the source of truth for built-in and custom tool definitions, but kept provider-specific execution in a separate MCP server.

That split creates an unnecessary service hop and a second credential boundary. The AI Service would either need provider credentials, or the MCP server would need its own vault access and rule synchronization. It also duplicates execution state and authorization logic across the Backend and MCP.

The AI turn already receives the agent configuration from the Backend. The Backend can supply the agent's executable tool list in the same context and remain the only component that authorizes and runs a tool.

The approval flow also changes: a pending approval has no execution. Approval creates and runs the execution; rejection creates none. The AI Service resumes with the stored execution result and returns the assistant message, which the Backend stores.

## Decision

- The Backend builds the complete tool list for each incoming turn. Each tool is `{ "name", "description", "inputSchema", "requiresApproval" }`.
- The AI Service does not fetch a separate tool list. It receives tools through the incoming turn context.
- The AI Service performs RAG with `workspaceId` and `agentId`; the incoming context does not carry a source-ID list.
- The AI Service calls `POST /internal/workspaces/{workspace_id}/tools/call` for tools whose `requiresApproval` is `false`.
- The AI Service calls `POST /internal/workspaces/{workspace_id}/approvals` for tools whose `requiresApproval` is `true`. The Backend creates a `pending` approval and no execution.
- The Backend resolves the tool from the `actions` table, validates the agent grant and arguments, fetches workspace credentials, rechecks the connection, executes built-in handlers or the generic custom-action handler, records the execution, and returns the result.
- Executions are created in `running` state. `startedAt` is removed; `createdAt` is the start and `finishedAt` is terminal.
- A built-in `401` marks the connection `invalid` and fails the execution. Other failures are retried twice more before the execution is failed.
- Execution results are stored for duplicate replay and approval resume.
- Execution and approval creation are idempotent per workspace key. An approved approval creates one execution linked to the approval.
- Provider credentials and custom-action secrets never leave the Backend.
- The target architecture has no MCP server.

## Alternatives considered

### Option A: Keep AI Service calling the MCP server directly

- Benefits: No Backend proxy; existing MCP contract remains.
- Costs: A second service hop and runtime; MCP needs vault access or per-call credentials; authorization and rule state are duplicated; another deployment boundary.
- Reason rejected: The Backend already owns definitions, grants, executions, approvals, and credentials.

### Option B: Backend proxies tool calls to the MCP server

- Benefits: The AI Service has one endpoint; MCP keeps provider handlers.
- Costs: Both services still run; the Backend and MCP must synchronize authorization and execution state; credentials still cross a service boundary or need a second vault client.
- Reason rejected: It adds a hop without removing the split that causes the problem.

### Option C: Backend owns definitions and execution

- Benefits: One authorization and execution boundary; no credential exposure to the AI Service; one source of truth for tool definitions and grants; fewer deployments.
- Costs: The Backend owns provider-specific handlers, SSRF protection, retries, and tool-call latency.
- Reason selected: It matches the product boundary and removes the second runtime.

### Option D: Create an execution before approval

- Benefits: Approval can reference an existing execution row.
- Costs: A pending approval would leave a non-terminal execution that never ran, and rejection would need a terminal execution state.
- Reason rejected: Approval-first is simpler; pending approvals have no execution, and rejection creates none.

## Consequences

### Benefits

- The AI Service needs only the tool context and the Backend tool-call API.
- Credentials stay inside the Backend.
- Tool definitions, grants, approvals, and executions are consistent.
- The MCP runtime and its rule/credential synchronization are removed.
- A stored result supports idempotent replay and approval resume retries.

### Trade-offs and risks

- The Backend API now carries provider-call latency and provider failure handling.
- Built-in and custom handlers must be covered by Backend tests.
- Removing the MCP package is a repository change that must be coordinated with any external consumer.
- A tool call can be synchronous; provider timeouts and retries must stay within the API timeout budget.
- Storing provider results increases database volume and may include sensitive data; retention and redaction need review.

### Operations

- Migration: keep the database-backed definitions from ADR-0003; add `executions.result`, add `messages.content`, default `executions.status` to `running`, remove `started_at`, add `approvals.status`, and remove unused execution statuses.
- Rollback: restore the previous Backend release; no separate MCP deployment remains. Removing `started_at` and enum values is a breaking migration.
- Monitoring: track tool-call latency, provider error codes, retry exhaustion, connection invalidation, approval age, duplicate idempotency keys, and resume failures.
- Documentation: update the AI Service contract, architecture, API design, internal OpenAPI, schema, and action/approval/knowledge docs.

## Follow-ups

- [ ] Implement the turn-context tool list and `POST /internal/workspaces/{workspace_id}/tools/call`.
- [ ] Implement `POST /internal/workspaces/{workspace_id}/approvals` and `POST /internal/workspaces/{workspace_id}/resume`.
- [ ] Move built-in and custom provider execution into the Backend and remove the MCP runtime path.
- [ ] Add contract tests for the tool list, tool-call results, idempotency, approval-first execution, and resume responses.
- [ ] Define result retention/redaction.
- [ ] Regenerate the published internal API reference.

## References

- [ADR-0003](ADR-0003-database-backed-built-in-tool-definitions.md)
- [AI Service integration contract](../ai-service-integration/ai-service-contract-v3.md)
- [System architecture](../architecture.md)
- [API outline](../api/api-design-outline.md)
- [Actions](../features/actions.md)
- [Approvals](../features/approvals.md)
- [Knowledge](../features/knowledge.md)
- [Database schema](../database/schema.dbml)
