---
name: implementation-planner
description: "Use for feature-sized or risky work that needs a written plan: create docs/work/<slug>/plan.md from the plan template, alongside the brief."
---

# Implementation Planner

Write `docs/work/<issue-id-or-short-slug>/plan.md` from
[`docs/templates/implementation-plan-template.md`](../../../docs/templates/implementation-plan-template.md),
next to the brief. Include:

- Goal and non-goals; scope and constraints from `docs/project-context.md`.
- Stack and conventions supported by repository evidence (use the `explorer` subagent for broad mapping).
- Affected files and modules; step-by-step implementation.
- Focused verification commands and expected evidence.
- Risks, mitigations, and rollback.