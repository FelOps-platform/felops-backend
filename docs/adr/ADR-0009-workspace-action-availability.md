# ADR-0009: Workspace-level action availability

Status: Accepted
Date: 2026-11-20
Deciders: FelOps backend team
Area: architecture, data

## Context

Users can enable or disable an integration action for their workspace. The action remains part of the code registry, but it may be disabled by the workspace, kept while credentials are invalid, or removed when the integration is disconnected.

Agent grants are separate from workspace availability. A disabled or unavailable action keeps existing grants but must not reach `agent_config`.

## Decision

- Store sparse workspace overrides in `workspace_action_settings`.
- A missing row means the action is enabled by default.
- Do not seed every registry action into the database when an integration connects.
- List actions for workspace integrations with a connection record, including invalid connections. Do not list actions from integrations the workspace never connected.
- Derive availability:
  - `Enabled`: connection healthy and no disabling override.
  - `Disabled`: workspace override has `enabled = false`.
  - `Unavailable`: integration connection is invalid.
- `PUT /workspaces/{workspace_id}/actions/{tool_key}/availability` updates the workspace override.
- Disabling an action keeps agent grants. Disabled and unavailable tools are omitted from `agent_config`.
- Invalid credentials keep workspace settings and agent grants.
- Explicit integration disconnect removes workspace action settings and agent grants for that integration.
- Removing an action from the code registry removes its workspace settings and grants.
- The Backend validates workspace action availability again during tool execution.

## Consequences

- The database stores only user overrides, not a copy of the action catalog.
- New registry actions appear automatically without backfill.
- Availability status is computed from registry membership, connection state, and workspace setting.
- Temporary credential failures do not destroy agent configuration.
- Explicit disconnect is destructive for that integration's action configuration.
- The action UI can show Enabled, Disabled, and Unavailable states without a stored availability column.

## References

- [Actions](../features/actions.md)
- [Integrations](../features/integrations.md)
- [Architecture](../architecture.md)
- [API outline](../api/api-design-outline.md)
- [Database schema](../database/schema.dbml)
- [ADR-0006](ADR-0006-code-backed-catalogs.md)
