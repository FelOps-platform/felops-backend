# ADR-0008: Multiple workspace channel instances

Status: Accepted
Date: 2026-11-20
Deciders: FelOps backend team
Area: architecture, data

## Context

The earlier channel model allowed one channel record per type per workspace. The product needs multiple channel instances of the same type, such as two WhatsApp numbers or two chat widgets, each configured and assigned independently.

Channel setup belongs to workspace settings. It is not part of agent creation or editing. A channel has at most one operating agent, while an agent may operate on many channels. A channel may be created unassigned.

Transport adapters, message delivery, webhooks, and conversation behavior are not complete yet.

## Decision

- A workspace may create multiple channel instances of the same channel type.
- Channel types and enabled state live in code.
- Each channel instance stores a workspace-specific name, channel type key, an optional one-agent assignment, and opaque config.
- Each channel has at most one operating agent. An agent may operate on many channels.
- Deleting an agent leaves its channels unassigned until a new agent is selected.
- Channel setup and editing happen in workspace settings, not in agent create or edit.
- Conversations reference a channel instance ID, not only a channel type.
- Workspace channels have no separate active toggle.
- The database table is `workspaces_channels`.

## Consequences

- The unique constraint on `(workspace_id, channel_key)` is removed.
- `workspaces_channels` adds a workspace instance `name`, unique per workspace.
- `conversations` references `channel_id`.
- ADR-0005 channel cardinality is superseded. Its single-agent assignment rule remains.
- Channel transport and conversation lifecycle remain future work.

## References

- [Channels](../features/channels.md)
- [Architecture](../architecture.md)
- [API outline](../api/api-design-outline.md)
- [Database schema](../database/schema.dbml)
- [ADR-0005](ADR-0005-async-ai-service-v3.md)
