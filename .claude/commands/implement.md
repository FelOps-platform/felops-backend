---
description: Implement authorized work, verify it, and arrange a fresh review.
---

Implement the task within the scope the user authorized.

1. Read AGENTS.md, docs/project-context.md, agent-metadata.md, and relevant code or plans.
   When the change touches API, schema, or service contracts, read `docs/api/api-design-outline.md`, `docs/standards/engineering-conventions.md`, and the owning feature doc.
2. For substantial work, prepare or update the plan. The user's clear request authorizes its stated scope; do not ask for approval a second time.
3. Delegate implementation to the implementer subagent when available. Follow `docs/standards/agent-routing.md` to bind its balanced tier at launch when supported; keep native role metadata inherited and state when the host cannot enforce the tier. Use focused changes and TDD where it fits.
4. Run relevant focused checks and report their exact results.
5. Arrange fresh-eyes review with a different reviewer agent when available. Use its balanced default and escalate only for demonstrated difficult issues, as described in `docs/standards/agent-routing.md`. Resolve material findings; if no reviewer is available, review the diff yourself and state that.
6. Update work notes and agent-metadata.md when the documented state changes.
7. After each cohesive, in-scope unit passes its focused checks, commit it promptly under the standing AGENTS.md authorization; do not ask for approval again. Do not commit plan-only work. Prepare handoff with /ship when useful. Push, merge, or deploy only when the user has already authorized that action in the active instructions.

If an ambiguity or consequential decision is outside the authorized scope, pause only that part and ask a focused question while continuing independent work.
