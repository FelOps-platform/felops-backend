# Agent routing

Use model tiers as host-neutral routing intent:

- **Explorer:** fast, low-cost tier for read-only mapping and search.
- **Implementer:** balanced, capable tier for authorized changes.
- **Reviewer:** balanced tier by default; escalate to a reasoning tier only when review finds demonstrated difficult issues.
- **Main agent / coordinator:** use the host-configured model.

Before launching agents, the coordinator resolves which models and per-agent routing
the host runtime supports, then binds each role to its intended tier when possible.
Tier descriptions do not switch models by themselves. Keep native role frontmatter
at `model: inherit` for Claude Code and Cursor; OpenCode V2 has no inherit value, so
`.opencode/agents` roles omit `model` instead. Do not add unsupported routing keys. If named roles can only
inherit the caller's model, state that the intended tier cannot be enforced by the
role definition and let host-level configuration handle it when available.
