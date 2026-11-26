---
name: implement
description: "Use when the user asks to build or change something, or when invoked as /implement: implement authorized work, verify it, and arrange a fresh review."
---

Implement the task within the scope the user authorized.

1. Read `AGENTS.md`, `docs/project-context.md`, and the relevant code or plan. For API, schema, or service-contract changes, also read what the `AGENTS.md` routing table names for that area.
2. For substantial work, make sure a plan exists (`/plan`). The clear request authorizes its stated scope; do not ask for approval a second time.
3. Delegate to the `implementer` subagent when available, binding tiers per [`.agents/README.md`](../../README.md#role-tiers) and stating when the host cannot enforce one. Use focused changes and the `tdd` skill where it fits.
4. Run the relevant checks from the `AGENTS.md` commands table and report exact results.
5. Arrange a fresh-eyes review with a different `reviewer` agent when available; resolve material findings. If none is available, review the diff yourself and say so.
6. Update work notes and owning docs when documented state changes.
7. Commit each cohesive, checked unit under the standing `AGENTS.md` authorization (never plan-only work). Hand off with `/ship`; push, merge, or deploy only when the user already authorized it.

If an ambiguity or consequential decision falls outside the authorized scope, pause only that part, ask a focused question, and continue independent work.