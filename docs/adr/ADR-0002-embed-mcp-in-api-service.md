# ADR-0002: Embed the MCP runtime in the API service

Status: Superseded by [ADR-0004](ADR-0004-backend-owned-tool-execution.md)
Date: 2026-11-01
Deciders: Backend team
Area: architecture

> **Superseded:** ADR-0004 replaces the MCP runtime with Backend-owned tool execution. This record remains for historical context.

## Context

The repository previously carried a standalone MCP package placeholder. It had
package metadata and a placeholder test script, but no runtime, imports, or
server implementation. The product design still needs an MCP component that
registers tools, checks agent permissions, runs connectors, verifies results, and
records an audit trail.

The backend is one service in this repository, and the current scope does not
authorize an MCP implementation. The team needs a component boundary that keeps
deployment and configuration simple without scaffolding code before the design
and contracts are ready.

## Decision

Implement the MCP runtime as a module embedded in the API service rather than as
a standalone package or service. The module is planned only; no MCP code exists
yet, and this ADR does not authorize a scaffold.
[Architecture](../architecture.md) describes the planned module and its flows.

## Alternatives considered

### Standalone package in this repository

- Benefits: a separate package boundary and independent versioning.
- Costs: a second package to build, deploy, and configure while sharing the same
  backend data and credentials; the placeholder had no runtime to justify it.
- Reason rejected: it adds operational overhead without an implemented service
  or an independent deployment need.

### Separate service or repository

- Benefits: independent scaling and release cadence.
- Costs: a new deployment target, network boundary, authentication, and shared
  configuration before any MCP behavior is designed or authorized.
- Reason rejected: the current scope and one-backend structure do not justify it.

### No MCP component

- Benefits: no additional component to design or operate.
- Costs: the product cannot enforce agent action rules or run integration tools
  as described in the architecture.
- Reason rejected: the MCP responsibilities remain part of the proposed product.

## Consequences

### Benefits

- One deployable backend service with shared configuration, authentication, and
  database access.
- No separate package lifecycle or inter-service authentication path is
  introduced.
- The module can reuse the API's existing logging and error handling.

### Trade-offs and risks

- The module needs clear internal boundaries so tool execution, permission
  checks, and connectors do not couple to HTTP request handling.
- Product credential delivery and rules synchronization remain open decisions;
  embedding the module does not settle them. See
  [Architecture decision records](../architecture.md#decision-records).
- Monitoring and audit behavior for the module are unknown until it is designed.

### Operations

- Migration: none; the placeholder package is removed and no runtime moves.
- Rollback: restore the placeholder package if the repository structure must
  match the former layout; no data or deployment change is involved.
- Monitoring: unknown; define it with the module implementation.
- Documentation: [Architecture](../architecture.md) describes the planned
  embedded module; [Delivery](../delivery.md) owns the design sequence.

## Follow-ups

- [ ] Implement the MCP module only when a work brief authorizes it.
- [ ] Settle product credential delivery and rules synchronization before
      implementing tool execution.

## References

- [Work brief](../work/sdd-docs-restructure/brief.md) and
  [plan](../work/sdd-docs-restructure/plan.md)
- [Architecture](../architecture.md)
- [AGENTS.md](../../AGENTS.md)
