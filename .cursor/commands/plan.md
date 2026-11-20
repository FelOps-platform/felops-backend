---
description: Clarify and plan substantial work.
---

Create a useful plan without turning planning into a redundant approval gate.

1. Read AGENTS.md, docs/project-context.md, agent-metadata.md, and relevant task docs.
2. Clarify only uncertainties that could materially change behavior, scope, or risk. Use grill-me-with-doc when the request is genuinely under-specified.
3. Explore relevant code and conventions. Use the explorer subagent for broad mapping when available; follow `docs/standards/agent-routing.md` for its launch tier and report if the host cannot enforce it.
   When the task changes API, schema, or service contracts, read `docs/api/api-design-outline.md`, `docs/standards/engineering-conventions.md`, and the owning feature doc.
4. For substantial work, write a brief and plan in docs/work/<issue-id-or-short-slug>/ using the provided templates. Skip task docs for routine edits.
5. Include scope, affected files, steps, focused verification, risks, and rollback.

A clear request authorizes the work it describes. If the user asked for a plan only, present it and stop. If the user requested implementation too, proceed through the implementation workflow once the scope is clear. Ask only for a material unresolved decision or an action requiring explicit authorization under AGENTS.md.
