# Claude Code

Follow AGENTS.md as the canonical repository guidance. Read docs/project-context.md for product goals and constraints, and agent-metadata.md for verified technical facts. If either is absent or incomplete, record unknowns rather than guessing.

Claude Code project agents are in .claude/agents/. Slash commands are in .claude/commands/: /onboard, /plan, /implement, and /ship. Reusable skills are in .claude/skills/. Follow docs/agent-routing.md for role tier intent: the coordinator binds tiers at launch when the host supports it; `model: inherit` alone does not enforce a tier.

A clear user request authorizes implementation within its stated scope. Use /plan to structure substantial work, not to request redundant approval. When the user asks for a plan only, stop after presenting it. Follow AGENTS.md for consequential actions that need explicit authorization.
