# Delivery

This document defines the team's product delivery sequence and the current
sprint scope. The coding-agent delivery loop for contributors lives in
[docs/onboarding/agent-workflow.md](onboarding/agent-workflow.md).

## Sprint sequence

Follow **Design → Implementation → Deployment**.

1. **Design:** keep the system architecture in [Architecture](architecture.md)
   and the current logical data model in [Database](database.md). Sprint scope
   and work records link to these living designs and describe the change rather
   than split or duplicate the designs.
2. **Implementation:** implement only after the relevant design and API
   contracts are ready. Endpoint definitions, request/response examples, and
   mocks belong in the team's Apidog workspace. That work starts after the
   pending database revision and Apidog invitation. Server coding follows the
   contract design.
3. **Deployment:** plan and execute deployment as a separate, authorized phase
   after implementation is ready.

For each product workflow, capture a short numbered main path, material failure
cases, and intentionally deferred scope. Keep schema details in the Database
document and high-level component flows in Architecture. Do not add endpoint
specifications or request/response mocks to these documents.

Label failures F1, F2, and so on, reference the affected step, and specify the
user-visible result, retry behavior, and required cleanup. Endpoint methods,
paths, requests, success responses, and errors belong in Apidog. Explicitly mark
incomplete failure designs as pending before implementing their endpoints.

## Sprint 1

**Status:** Proposed; this product flow is not implemented by the current API.

**Goal:** prove the core idea end to end with an action that does not require
approval: a user sends a message, the AI selects a tool, the MCP module enforces
the saved rules, an action runs on Odoo, and the reply returns through the
channel.

### Scope

The proposed component sequence and data flows live in
[Architecture](architecture.md); the logical schema and open decisions live in
[Database](database.md). Sprint 1 covers:

1. Channel message — see [Architecture](architecture.md).
2. Integration setup — see [Architecture](architecture.md).
3. Agent configuration — see [Architecture](architecture.md).
4. Authentication — see [Architecture](architecture.md).

### Exclusions

The Approval Service is excluded from Sprint 1. Actions that require approval
are outside this goal. The broader component exclusions are listed in
[Architecture](architecture.md).

## Current handoff

The database revision and Apidog invitation are pending. Endpoint design, mocks,
and backend implementation have not started in this documentation set. API
endpoint definitions, request/response examples, and mocks belong in the team's
Apidog workspace; server coding follows that contract design. See
[Architecture](architecture.md) for the proposed flows and
[Database](database.md) for the schema questions.
