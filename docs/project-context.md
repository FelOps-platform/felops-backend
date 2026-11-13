# Project context

Source and docs inspected 2026-11-01. Product descriptions below distinguish current code from proposed workflows.

## Product

- What it is: This repository contains the FelOps backend API scaffold. Product docs describe a multi-tenant automation platform where workspace users configure integrations and agent actions. [api/src/app.ts](../api/src/app.ts), [Architecture](architecture.md)
- Problem: The planned product connects workspace workflows to external business systems through configured actions and agents. The backend code currently exposes only a health endpoint; those workflows are not implemented here.
- Users: Backend contributors; the documented product workflows are for workspace users configuring integrations and allowed actions. [Architecture](architecture.md)
- Success looks like: Current implemented behavior is GET /api/v1/health returning status ok. Product outcomes such as integration setup, action permissions, and execution history remain proposed. [api/src/app.ts](../api/src/app.ts), [Architecture](architecture.md)
- Non-goals: Documentation work does not implement business endpoints, MCP runtime, migrations, AI orchestration, or deployment. AI work remains in the separate felops-ai project; do not move that stack into this repository. [adoption brief](work/agent-seed-adoption/brief.md)

## Constraints

- The backend code and npm scripts are under api/. The MCP runtime is planned as a module embedded in the API service; no MCP code exists yet. [api/package.json](../api/package.json), [ADR-0002](adr/ADR-0002-embed-mcp-in-api-service.md)
- API startup requires Infisical bootstrap credentials and validates runtime settings including LOG_LEVEL, PORT, and DATABASE_URL. This runtime secret integration does not specify access to user or workspace vault data. [api/.env.example](../api/.env.example), [api/src/config/env.ts](../api/src/config/env.ts)
- Hosting, deployment target, and production runtime requirements are unknown; do not infer them from the package scripts.
- The canonical [architecture](architecture.md) and [database design](database.md) describe proposed behavior. Edit them in place and link them from work records; they are not evidence of implementation.
- The team's API endpoint contracts and request/response mocks are to be designed in Apidog after the database revision and workspace invitation. No accessible workspace URL or completed contract is established here. [Delivery](delivery.md#current-handoff)

## Terminology

| Term | Meaning |
| --- | --- |
| API Server | The implemented Express process in api/src/server.ts and api/src/app.ts |
| AI Service | A separate service described in the architecture docs; AI work lives in felops-ai |
| MCP module | Planned tool execution module embedded in the API service; no runtime exists yet ([ADR-0002](adr/ADR-0002-embed-mcp-in-api-service.md)) |
| Action | A proposed operation on a connected business system, with agent permissions and approval described in the architecture flows |
| Saved rules | The planned Backend stores rules in PostgreSQL; the MCP module enforces them. The synchronization contract is open. |
| Integration | A proposed workspace connection to an external business system; workflows are documented but not implemented |

## Open decisions

Product credential delivery and rules synchronization are owned by
[Architecture open decisions](architecture.md#open-decisions). Schema questions
such as session identity, agent/channel cardinality, workspace isolation, and
message storage are owned by
[Database open design questions](database.md#open-design-questions).

## Sources

- [API package and lockfile](../api/package.json), [API README](../api/README.md)
- [API app](../api/src/app.ts), [runtime config](../api/src/config/env.ts), [Infisical adapter](../api/src/integrations/infisical/fetch-secrets.ts), [database module](../api/src/config/db.ts), and [schema](../api/src/database/schema.ts)
- [Architecture](architecture.md), [database](database.md), and [delivery](delivery.md)
- [Adoption brief](work/agent-seed-adoption/brief.md) and [adoption plan](work/agent-seed-adoption/plan.md)
- [Documentation consolidation](work/documentation-consolidation/brief.md) and [verification](work/documentation-consolidation/qa.md)
