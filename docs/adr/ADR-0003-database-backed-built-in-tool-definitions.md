# ADR-0003: Store built-in tool definitions in PostgreSQL

Status: Superseded by [ADR-0006](ADR-0006-code-backed-catalogs.md)
Date: 2026-10-23
Deciders: FelOps backend team
Area: architecture, data, integrations

ADR-0006 moves integration and action definitions into the code registry. ADR-0004 superseded the MCP-specific execution ownership.

> Scope note: custom actions are deferred and not part of current product scope. References to custom actions below are historical context for this decision.

## Context

The MCP server currently owns built-in tool definitions. That does not scale to thousands of built-in actions: every description, input schema, or catalog change would require an MCP deployment, and the definitions would duplicate the action catalog already stored in PostgreSQL. Custom actions already keep their definitions in the database, so the two action types would use different sources of truth.

Built-in actions still need provider-specific execution logic. A single generic HTTP handler cannot implement their authentication, request shaping, response handling, and error mapping.

## Decision

- The `actions` table is the source of truth for both built-in and custom tool definitions: stable action identity, description, and `input_schema`.
- The Backend returns complete built-in and custom tool definitions to the MCP server. The MCP server does not keep a separate built-in definition registry.
- The MCP server keeps a code-level handler map keyed by the stable built-in `toolName`. Each built-in action resolves to its provider-specific handler.
- Custom actions continue to use one generic HTTP handler configured by the stored request definition.
- A built-in action whose handler is missing from the map is a configuration error and must not be exposed as a tool.
- The internal `type` discriminator selects the execution path: built-in handler map vs. custom generic handler. It remains internal to the MCP server.

## Alternatives considered

### Option A: Keep built-in definitions hardcoded in the MCP server

- Benefits: Definitions and handlers live together; no database lookup for definitions.
- Costs: Thousands of definitions in code; definition changes require MCP deployments; duplicates the action catalog; creates drift between Backend and MCP.
- Reason rejected: It does not scale and makes the database catalog incomplete as a source of truth.

### Option B: Use one generic handler for all actions

- Benefits: No per-action handler map.
- Costs: Built-in integrations need provider-specific authentication, request construction, response parsing, and error handling; a generic handler would become an unmaintainable branch tree or lose behavior.
- Reason rejected: Built-ins need concrete handlers.

### Option C: Generate handlers from database metadata

- Benefits: A single catalog drives definitions and execution.
- Costs: Unsafe for arbitrary provider behavior; generated code adds build, review, and security complexity.
- Reason rejected: The execution surface should remain explicit code.

### Option D: Database-backed definitions with a built-in handler map

- Benefits: Definitions scale as data; handlers remain explicit; custom actions share one generic handler; one catalog serves the Backend, MCP, and AI Service.
- Costs: The database must be seeded/validated; handler coverage must be checked; definition changes and handler changes have different deployment paths.
- Reason selected: It preserves provider-specific logic while removing the scaling and duplication problem.

## Consequences

### Benefits

- Adding or changing built-in descriptions and input schemas is a database change, not an MCP definition deployment.
- Built-in and custom definitions have the same transport and shape.
- The MCP server no longer embeds a large tool catalog.
- Agent tool lists can be assembled entirely from database-backed definitions.

### Trade-offs and risks

- Adding a new built-in handler still requires an MCP code change and deployment.
- A missing handler must fail closed rather than exposing a broken tool.
- The database seed and MCP handler map can drift; deployment checks must validate coverage.
- Built-in definitions now depend on the Backend's availability before tools can be listed.

### Operations

- Migration: seed built-in definitions into `actions` and validate `input_schema`.
- Rollback: restore the previous MCP release; database definitions remain compatible because the API returns the same definition shape.
- Monitoring: log and alert on built-in tools without handlers, and on definition validation failures.
- Documentation: update the internal tool contract, architecture, action catalog decisions, and schema comments.

## Follow-ups

- [ ] Implement the database-backed built-in definitions in the Backend tools endpoint and MCP loader.
- [ ] Add a release check that every active built-in action has a handler.
- [ ] Add contract tests for complete built-in and custom definitions.
- [ ] Regenerate the OpenAPI description and publish the updated API reference after design sign-off.

## References

- [Integrations and actions](../features/integrations.md)
- [API outline](../api/api-design-outline.md)
- [AI Service integration contract](../ai-service-integration/ai-service-contract-v3.md)
- [Database schema](../database/schema.dbml)
