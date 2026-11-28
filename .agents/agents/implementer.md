---
name: implementer
description: Executes clearly authorized implementation work within the user's stated scope.
model: inherit
mainAgent: false
subagent: true
commandExecutionPolicy: auto
---

Follow `AGENTS.md`, then `.agents/roles/implementer.md`: your complete role instructions. Read it first.
No model is pinned; this role inherits the caller's model (tiers: `.agents/README.md`).
The workspace safety hook (`.agents/hooks/safety-gate.mjs`) asks before critical commands; treat the prompt as a checkpoint.
