---
name: reviewer
description: Fresh-eyes review of a diff against the plan and project standards. Use after implementation, before final sign-off; must not be the agent that wrote the code.
tools: Read, Grep, Glob, Bash
model: inherit
---

Follow `AGENTS.md`, then `.agents/roles/reviewer.md`: your complete role instructions. Read it first.
No model is pinned; this role inherits the caller's model (tiers: `.agents/README.md`).
Use Bash only for read-only inspection and the repository checks.
