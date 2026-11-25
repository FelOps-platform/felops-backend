# Feature brief: Backend-owned tool execution

Status: Superseded by AI Service contract v3
Created: 2026-10-25
Related issue: [ADR-0004](../../adr/ADR-0004-backend-owned-tool-execution.md), [ADR-0005](../../adr/ADR-0005-async-ai-service-v3.md)

> Historical record. This brief captures the pre-v3 proposal; the flow below is not current API guidance. Use [ADR-0005](../../adr/ADR-0005-async-ai-service-v3.md) and the [v3 contract](../../ai-service-integration/ai-service-contract.md) for current behavior. Custom actions are deferred and out of current scope.

## Problem and context

The previous design used a separate MCP server to expose tools and execute provider calls. The Backend already owns action definitions, agent grants, executions, approvals, integration connections, and encrypted credentials. The AI Service only needs the executable tool list in the incoming turn and a Backend endpoint that performs the call.

The new flow separates approval from execution. A pending approval has no execution. Approval creates and runs the execution; rejection creates none. The AI Service returns the assistant message for the Backend to store.

## Goal and non-goals

### Goal

- Supply each incoming turn with `name`, `description`, `inputSchema`, and `requiresApproval` for every executable agent tool.
- Let the AI Service execute non-approval tools through the Backend.
- Create pending approvals for approval-gated tools without creating executions.
- Execute approved tools in the Backend and resume the AI Service with the result.
- Return the assistant message in the turn or resume response so the Backend can store it.
- Keep provider credentials inside the Backend.

### Non-goals

- Implementing the endpoints, database migrations, or AI orchestration in this design pass.
- Designing a workspace-wide approvals UI.
- Defining message-history client APIs; the conversation lane owns them.
- Defining result retention/redaction.
- Changing the frontend code in this repository.

## Expected behavior

1. The Backend sends the AI Service the workspace, conversation, new message, agent configuration, and executable tool list.
2. The AI Service retrieves knowledge from Chroma by `workspace.id` and `agent.id` (the pre-v3 vector store; Qdrant is used now).
3. For a non-approval tool, the AI Service calls `POST /internal/workspaces/{workspace_id}/tools/call`.
4. The Backend creates a `running` execution, fetches credentials, rechecks the connection, resolves the handler, executes the tool, retries non-`401` failures twice, stores the result, and returns the terminal execution.
5. For an approval-gated tool, the AI Service calls `POST /internal/workspaces/{workspace_id}/approvals`. The Backend creates a `pending` approval and no execution.
6. On approval, the Backend creates one execution, executes the tool, stores the result, and calls `POST /internal/workspaces/{workspace_id}/resume`.
7. On rejection, the Backend updates the approval to `rejected`, creates no execution, and calls the same resume endpoint with the rejection status.
8. The AI Service returns the assistant message in the turn or resume response; the Backend stores it in the conversations/messages tables.

## Acceptance criteria

- [ ] The incoming context includes `tools` with `name`, `description`, `inputSchema`, and `requiresApproval`; it contains no message history.
- [ ] Non-approval tool calls create a `running` execution and produce a terminal status.
- [ ] A built-in `401` marks the connection invalid and fails the execution without a provider retry.
- [ ] Other failures are attempted three times before the execution is failed.
- [ ] Approval creation is idempotent and creates no execution.
- [ ] Approval creates one execution and sends the result in the resume request.
- [ ] Rejection creates no execution and still returns an assistant message through resume.
- [ ] The assistant message is returned in the turn/resume response and stored by the Backend.
- [ ] The schema has no `started_at`, approval status is explicit, and execution status is `running | succeeded | failed`.

## Backend workflow design

- Main sequence: incoming context → agent-scoped retrieval → tool decision → tool call or approval → execution → assistant message.
- API endpoints: `POST /internal/.../tools/call`, `POST /internal/.../approvals`, `POST /internal/.../resume`.
- Data model: `executions` stores `result`, `approval_id`, `tool_name`, `tool_arguments`, and terminal timestamps; `approvals` stores `status`, tool snapshot, and idempotency key; `messages` stores backend conversation history.
- Failure cases: invalid arguments, unknown tool, unavailable grant/action/handler/connection, provider `401`, retry exhaustion, duplicate execution, resume failure, and missing conversation/workspace.
- Deferred scope: workspace-wide approvals, result retention/redaction, and implementation.

## Impacted areas

- User flows: tool execution, approval decision, conversation history.
- APIs or integrations: AI Service internal handoffs, provider execution, and vector-store ingestion metadata (Chroma in that proposal).
- Data and privacy: execution results and message content may contain sensitive data; retention/redaction is out of scope.
- Permissions: workspace membership for approval decisions; service identity tokens for internal calls.

## Risks and constraints

- The Backend is the critical path for every tool call.
- The AI Service must not receive provider or custom-action credentials.
- Tool lists can become stale; the Backend must recheck grant, action, connection, and handler.
- Result storage increases database volume and sensitivity.

## Evidence needed

- [ ] OpenAPI internal validation.
- [ ] DBML parse.
- [ ] Backend documentation consistency check.
- [ ] Implementation contract tests after `/plan`.
