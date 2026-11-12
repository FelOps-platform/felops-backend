# FelOps documentation

`docs/` is the single documentation source for this repository. It is the
project constitution for humans and coding agents: the four core documents
describe what the product is, how it is designed, how its data is modeled, and
how work moves from design to deployment.

## Core documents

| Document | Owns |
| --- | --- |
| [Project context](project-context.md) | Product goals, users, success, non-goals, constraints, terminology, and known unknowns |
| [Architecture](architecture.md) | Proposed components, main product flows, component map, and open product decisions |
| [Database](database.md) | Proposed logical schema, relationships, workspace isolation, and open schema questions |
| [Delivery](delivery.md) | Design → Implementation → Deployment sequence, Sprint 1 scope, workflow-design guidance, and the Apidog handoff |

## Reading order

1. [AGENTS.md](../AGENTS.md) for repository workflow, boundaries, and approval rules.
2. [Project context](project-context.md) for product intent and constraints.
3. [Architecture](architecture.md) and [Database](database.md) for the proposed design.
4. [Delivery](delivery.md) for the team sequence, current sprint, and contract handoff.
5. [agent-metadata.md](../agent-metadata.md) for verified technical and agent state.
6. The relevant `docs/work/<item>/` record and `docs/adr/` entry for the task.

## Supporting records

- [Work records](work/README.md): one folder per substantial change, holding the
  brief, plan, and optional verification notes.
- [Architecture decision records](adr/README.md): durable decisions, one per
  sequentially numbered file.
- [Agent onboarding](onboarding/agent-onboarding.md) and the
  [coding-agent workflow](onboarding/agent-workflow.md): contributor entry point
  and task loop.
- [Agent routing](agent-routing.md): host-neutral role tiers and model binding.
- [AI engineering rules](ai-engineering-rules.md): apply when changing an
  LLM-backed feature.
- [Templates](templates/): starting points for briefs, plans, and ADRs.

## Ownership and updates

- Each fact has one owner. Update the owning document in place; link to it from
  work records instead of copying its content.
- Architecture and database changes update [Architecture](architecture.md) and
  [Database](database.md) in the same change. Delivery process changes update
  [Delivery](delivery.md).
- `agent-metadata.md` records verified stack, architecture, integrations, and
  agent behavior. Update it when those facts change.
- There is no separate specifications folder. For a substantial change, the work
  brief is the change specification, and the plan records the approach and
  verification.
- API endpoint contracts and request/response mocks belong in the team's Apidog
  workspace. [Delivery](delivery.md#current-handoff) records the current handoff
  state; do not duplicate endpoint specifications here.

## Status rules

- Design documents describe proposed behavior unless code proves otherwise.
  Label implemented behavior and planned behavior separately; never present a
  planned component as running code.
- Work records use the lifecycle Draft → Planned → In Progress → Done. Record a
  blocking decision as Awaiting input. Mark Done only after acceptance criteria
  and relevant verification are complete.
- Work records are historical evidence. They may contain path text that was
  current when written; use this page for current paths, and fix broken links
  when touching a record.
