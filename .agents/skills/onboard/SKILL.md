---
name: onboard
description: "Use when starting in this repository or when invoked as /onboard: map the verified stack, structure, and unknowns without implementing."
---

Onboard without assuming a stack or loading the whole repository.

1. Read `AGENTS.md` and `docs/project-context.md`.
2. Map broadly with the `explorer` subagent when available; otherwise read manifests, entry points, and the docs the `AGENTS.md` routing table names.
3. Record only evidence-backed facts in the "Verified technical state" section of `docs/project-context.md`: cite source files and mark unknowns as Unknown. Do not turn exploratory ideas into requirements.
4. Report the verified overview and material unknowns; ask only what blocks the next task.
5. Route the next step: scoped change → `/plan` then `/implement`; handoff → `/ship`.

Do not implement product changes during onboarding unless the user's request explicitly includes them.