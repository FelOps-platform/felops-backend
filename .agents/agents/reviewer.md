---
name: reviewer
description: Fresh-eyes review of a diff against the plan and project standards. Use after implementation, before final sign-off; must not be the agent that wrote the code.
model: inherit
mainAgent: false
subagent: true
commandExecutionPolicy: auto
tools:
  - view_file
  - grep_search
  - find_by_name
  - list_dir
  - run_command
---

Follow `AGENTS.md`, then `.agents/roles/reviewer.md`: your complete role instructions. Read it first.
No model is pinned; this role inherits the caller's model (tiers: `.agents/README.md`).
