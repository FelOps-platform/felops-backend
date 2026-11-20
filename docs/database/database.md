# Database

The canonical table, column, enum, and relationship definitions live in [schema.dbml](schema.dbml). This page explains how to read and change the database design; it does not duplicate the DBML.

## Current implementation

The API currently defines only a `users` table in [api/src/database/schema.ts](../../api/src/database/schema.ts). The health route does not use the database. The product tables in the DBML are planned until migrations and API behavior implement them.

## Table groups

- **Identity and workspace:** `users`, `workspaces`, and membership records.
- **Integrations and actions:** workspace integration connections, OAuth state, workspace action settings, agent action grants, and executions.
- **Agents and knowledge:** agents, workspace knowledge sources, and agent-to-source assignments.
- **Channels and conversations:** workspace channel instances, conversations, and messages.
- **Approvals:** AI-generated approval requests and their decisions.

## Invariants

- Every workspace-owned row is scoped by `workspace_id`.
- Integration, built-in action, and channel definitions live in code. The database stores workspace state and grants, not a copy of the catalog.
- Workspace action settings are sparse. A missing row means the action is enabled by default.
- Knowledge sources are workspace-wide. Agents select from that library through `agents_knowledge_sources`; there are no agent-specific source rows.
- Hard deletes cascade through foreign keys unless a feature document defines an explicit exception.
- Knowledge deletion requests a vector purge before local deletion. A purge failure keeps the source and assignments for retry.
- Agent and source validation must confirm same-workspace membership and a ready source.
