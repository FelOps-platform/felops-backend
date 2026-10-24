# Sprint 1

**Status:** Proposed; this product flow is not implemented by the current API.

**Goal:** prove the core idea end to end with an action that does not require
approval: a user sends a message, the AI selects a tool, the MCP Server enforces
the saved rules, an action runs on Odoo, and the reply returns through the
channel.

The Approval Service is excluded from Sprint 1. Actions that require approval
are outside this goal. The proposed component sequence and data flow live in
[Architecture](../architecture.md); the logical schema and open decisions live
in [Database](../database.md).

## Workflows

1. Channel message — see the proposed flows in [Architecture](../architecture.md).
2. Integration setup — see [Architecture](../architecture.md).
3. Agent configuration — see [Architecture](../architecture.md).
4. Authentication — see [Architecture](../architecture.md).

Endpoint definitions and request/response mocks will be designed in Apidog
after the pending database revision and workspace invitation. Backend endpoint
implementation follows that design; see [Workflow](../workflow.md).
