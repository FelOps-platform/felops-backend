---
name: implementation-planner
description: "Use for feature-sized or risky work that needs a written plan: create docs/work/<slug>/plan.md from the plan template, alongside the brief."
---

# Implementation Planner

Write `docs/work/<issue-id-or-short-slug>/plan.md` from
[`docs/templates/implementation-plan-template.md`](../../../docs/templates/implementation-plan-template.md),
next to `brief.md`. Make the plan mechanical and self-contained for a fresh-context or smaller agent:

- Cite the live golden blueprint (`api/src/modules/workspaces/` or `api/src/modules/auth/`) instead of abstract prose.
- Specify exact HTTP contracts (method, path, auth, Zod request shape, response envelope, error codes) and exact file paths to create or modify.
- Spell out database/transaction invariants explicitly (including commit-before-throw when a write inside `getDb().transaction(...)` must persist).
- List exact PGlite test cases (`createTestRuntime()`), `api/scripts/generate-openapi.ts` updates (preserving stable Apidog `operationId`s), verification commands, and suggested atomic commit slices.
- Record risks, mitigations, and rollback without inventing stack or requirements.
