# ADR-0005: Async AI Service contract v3 and single-agent channel assignment

Status: Accepted (channel cardinality amended by ADR-0008; knowledge scoping amended by ADR-0010)
Date: 2026-11-16
Deciders: FelOps backend team
Area: architecture, data, integrations

> **Amendment:** ADR-0008 replaces the one-channel-per-type rule with multiple workspace channel instances per type. The single-agent assignment rule remains. ADR-0010 replaces shared or agent-scoped knowledge sources with a workspace-only source library selected by agents.

## Context

AI Service contract v3 moves turns, approvals, and knowledge ingestion to asynchronous jobs. The AI Service owns LangGraph checkpoints, durable jobs, Qdrant retrieval, SSE, and webhooks. The Backend owns the catalog, agent configs, credentials, tool execution, approvals, and frontend conversation history.

The channel model also changes: a workspace has one channel per type, each channel has at most one agent, and an agent can serve many channels. Channels are configured separately from agent creation.

ADR-0004 remains valid for Backend-owned tool definitions and execution, but its approval and turn mechanics are superseded.

## Decision

- Turns use `POST /workspaces/{workspace_id}/conversations/{conversation_id}/messages` and return `202 { job_id }`.
- The AI Service loads history from its checkpoint and returns messages through `message.final` webhooks; SSE streams deltas for capable channels.
- Approvals are requested by AI-generated `approval.required` webhooks. Pending approvals create no execution.
- Approval decisions are forwarded to the AI Service. The AI Service validates and calls `POST /internal/workspaces/{workspace_id}/tools/call` when approved.
- Tool calls include `integrationKey`, `toolKey`, `arguments`, and an idempotency key. The Backend validates, executes, retries transient failures, verifies the provider response, and stores the result.
- Side-effecting calls deduplicate across running and terminal states; read-only calls deduplicate only while running.
- The Backend owns the global catalog; CI/CD pushes it and the AI Service pulls it on startup or version mismatch.
- Knowledge sources belong to the workspace, are content-hashed for workspace-deduplication, and are selected by agents. Qdrant vectors are owned by the AI Service. ADR-0010 supersedes the original shared or agent-scoped model.
- A workspace has one channel per type. Each channel has at most one agent; an agent may have many channels. Channel setup is not part of agent creation.

## Consequences

- The Backend no longer executes an approved tool directly from the decision endpoint; execution enters through `tools/call`.
- Approvals and executions are separate records.
- Async jobs require SSE/webhook projections and durable AI jobs.
- The schema removes `agents_channels`, adds workspace channel records, approval UUIDs/hashes, catalog metadata, and workspace source assignments.
- Agent creation has four steps (Basic information, Assign Actions, Configure Knowledge, Review & save); channel setup is separate.

## References

- [AI Service contract v3](../ai-service-integration/ai-service-contract.md)
- [Architecture](../architecture.md)
- [API outline](../api/api-design-outline.md)
- [Channels](../features/channels.md)
- [ADR-0008](ADR-0008-multiple-channel-instances.md)
- [ADR-0010](ADR-0010-workspace-only-knowledge.md)
- [Approvals](../features/approvals.md)
- [Actions](../features/actions.md)
- [Knowledge](../features/knowledge.md)
- [ADR-0004](ADR-0004-backend-owned-tool-execution.md)
