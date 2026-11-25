# ADR-0010: Workspace-only knowledge sources

Status: Accepted
Date: 2026-11-20
Deciders: FelOps backend team
Area: architecture, data, contracts

## Context

The earlier model allowed both workspace-level and agent-specific sources. It required scope-aware deduplication, per-association display metadata, reference-counted deletion, and separate ingestion endpoints. It also created edge cases when sources were shared across agents or promoted from an agent to the workspace.

Agent knowledge should be simple: the workspace maintains one knowledge library, and each agent selects the sources it may use. Agent-specific uploads add complexity without a product requirement.

## Decision

- Workspace Knowledge is the only source library. There are no agent-specific sources or uploads.
- Each source belongs to one workspace and is stored once.
- Sources are deduplicated by content hash within the workspace.
- Source `name` and `description` belong to the workspace source, not to an agent association.
- Agents select workspace sources through `agents_knowledge_sources`.
- The Backend validates that every selected source belongs to the same workspace and is ready before saving an assignment.
- Assigning a source does not copy, re-ingest, or change its vectors.
- The Backend sends the selected `knowledge_source_ids` in each turn's `agent_config`.
- The AI Service retrieves only the selected source IDs from Qdrant.
- Deleting a source purges its vectors first, then removes its agent assignments and metadata. A purge failure keeps the source intact for retry.
- Deleting an agent removes its assignments only; workspace sources remain.
- Source ingestion and status endpoints are workspace-scoped only.

## Consequences

- `knowledge_sources` drops the scope columns and stores display metadata once.
- `knowledge_source_links` is replaced by `agents_knowledge_sources`.
- The link table does not duplicate `workspace_id`; the Backend enforces same-workspace and ready-source membership on every create and replace.
- The API removes agent-specific source creation; agent knowledge `PUT` replaces source selections.
- The AI Service contract removes agent source ingestion and deletion endpoints, agent metadata from ingestion webhooks, and reference-counted deletion.
- Source lifecycle and assignment are simpler, with no promotion or cross-scope deduplication paths.
- ADR-0005 knowledge scoping is superseded. Its asynchronous job, approval, and channel decisions remain.

## References

- [Knowledge](../features/knowledge.md)
- [Agents](../features/agents.md)
- [API outline](../api/api-design-outline.md)
- [Database schema](../database/schema.dbml)
- [AI Service contract v3](../ai-service-integration/ai-service-contract.md)
- [ADR-0005](ADR-0005-async-ai-service-v3.md)
