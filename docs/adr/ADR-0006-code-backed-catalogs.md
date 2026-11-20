# ADR-0006: Code-backed integration, action, and channel definitions

Status: Accepted
Date: 2026-11-17
Deciders: FelOps backend team
Area: architecture, data

## Context

Integrations, built-in actions, and channel types are finite catalogs tied directly to backend code. Adding or changing one requires adapter, handler, or channel behavior changes. Storing their definitions in PostgreSQL created a second source of truth that could drift from the code.

Workspace state is different. Connections, encrypted credentials, action grants, execution history, channel assignments, and channel configuration must be durable and are owned per workspace.

## Decision

- Integration definitions live in code: key, auth method, OAuth settings, enabled state, supported actions, and adapter.
- Built-in action definitions live in code: stable tool key, integration key, LLM-facing description, input schema, side effect, version, enabled state, and handler.
- Channel type definitions live in code: channel key, enabled state, behavior, and configuration validation.
- Frontend localization owns static display names, descriptions, and category labels. The Backend does not store or send them. Frontend code maps integration keys, action tool keys, channel keys, and category keys to localized text.
- The database stores workspace state only: integration connections and encrypted credentials, agent action grants by tool key, executions, workspace channel instances, agent assignments, and channel config.
- Agent grants reference stable tool keys. Executions store the integration key and tool key snapshots.
- The catalog version comes from the registry build or content hash. CI/CD serializes the code registry and pushes it to the AI Service.
- Global catalog changes require a deployment. If non-deploy overrides become necessary, add a small override table instead of copying full definitions into the database.
- Custom actions remain deferred. If added, they use a separate database-backed definition table and a generic HTTP handler.

## Consequences

- The `integrations`, `actions`, and `catalog_state` tables are removed.
- `workspaces_integrations` uses `integration_key` instead of an integration foreign key.
- `agents_actions` uses `tool_key` instead of an action foreign key.
- `executions` keeps tool and integration snapshots without an action foreign key.
- Channel rows no longer store type display names or descriptions; only the workspace instance name remains user data.
- Action descriptions are LLM-facing catalog text and are never returned to the frontend for display.
- Static frontend text changes in localization files, not backend catalog changes.
- Catalog metadata changes require a deploy, but code and catalog cannot drift.
- Deployment checks must fail when an active action or integration has no handler.

## References

- [Architecture](../architecture.md)
- [Integrations](../features/integrations.md)
- [Actions](../features/actions.md)
- [Channels](../features/channels.md)
- [Database schema](../database/schema.dbml)
- [ADR-0003](ADR-0003-database-backed-built-in-tool-definitions.md)
- [ADR-0004](ADR-0004-backend-owned-tool-execution.md)
