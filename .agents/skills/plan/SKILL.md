---
name: plan
description: "Use for feature-sized, risky, or under-specified work, or when invoked as /plan: clarify, explore, and write the docs/work brief and plan."
---

Plan substantial work without creating a redundant approval gate.

1. Read `AGENTS.md`, `docs/project-context.md`, and relevant task docs. For API, schema, or service-contract work, also read what the `AGENTS.md` routing table names for that area.
2. Clarify only uncertainties that could materially change behavior, scope, or risk; use the `grill-me-with-doc` skill when the request is genuinely under-specified.
3. Explore code and conventions; use the `explorer` subagent for broad mapping.
4. For substantial work, write the brief and plan with the `implementation-planner` skill. Skip task docs for routine edits.

A clear request authorizes the work it describes. If the user asked for a plan only, present it and stop; if implementation was requested too, continue with `/implement`. Ask only about a material unresolved decision or an action `AGENTS.md` reserves for explicit authorization.