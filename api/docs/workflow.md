# Product Workflow

This document defines the team's product sprint sequence. The coding-agent
delivery loop for contributors lives in
[docs/onboarding/agent-workflow.md](../../docs/onboarding/agent-workflow.md).

## Sprint sequence

Follow **Design → Implementation → Deployment**.

1. **Design:** keep the system architecture in [Architecture](architecture.md)
   and the current logical data model in [Database](database.md). Sprint and
   feature documents describe the workflow and link to these living designs;
   work records describe changes rather than split or duplicate the designs.
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

## Current handoff

The database revision and Apidog invitation are pending. Endpoint design, mocks,
and backend implementation have not started in this documentation set. See
[Sprint 1](sprints/sprint-1.md), the [Actions](features/actions.md) proposal, and
the [Integrations](features/integrations.md) proposal.
