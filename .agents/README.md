# Coding-agent configuration

`.agents/` plus the root [`AGENTS.md`](../AGENTS.md) are the single source of truth for OpenCode,
Antigravity, Cursor, and Claude Code. Host directories hold only thin adapters; edit the canonical
file, never a copy. `bash bin/check-agent-workflow.sh` fails when copies or bloat creep back.

| Path | Owner of |
| --- | --- |
| `AGENTS.md` | Commands, invariants, working agreement, docs routing table (≤ 160 lines) |
| `.agents/skills/<name>/SKILL.md` | Every skill **and** every command: `/onboard /design /plan /implement /ship` are skills |
| `.agents/roles/{explorer,implementer,reviewer}.md` | Role playbooks (boundary, verification, output contract) |
| `.agents/lib/doc-reminder-rules.mjs` | Docs-reminder path rules and message |
| `.agents/hooks.json`, `.agents/hooks/` | Antigravity-only: safety gate and reminder adapter |
| `.agents/agents/` | Antigravity role adapters |

## Host adapters

| Host | Reads natively | Adapter files |
| --- | --- | --- |
| OpenCode | `AGENTS.md`, `.agents/skills`, `.claude/skills` (same name registers once) | `.opencode/agents/` (permissions + pointer), `.opencode/commands/` (3-line wrappers; OpenCode has no skill-as-command), `.opencode/plugins/doc-reminder/`, `opencode.json` |
| Antigravity | `AGENTS.md`, `.agents/skills`, `.agents/hooks.json`, `.agents/agents` | the `.agents/` entries above |
| Cursor | `AGENTS.md`, `.agents/skills` | `.cursor/agents/`, `.cursor/hooks.json` + hook, `.cursor/rules/10-api-express.mdc` (`api/**` glob pointer) |
| Claude Code | `CLAUDE.md` (`@AGENTS.md`), `.claude/skills` | `.claude/skills` (symlink to `../.agents/skills`), `.claude/agents/`, `.claude/settings.json` + hook |

Commands are skills because Antigravity, Claude Code, and Cursor expose skills as slash commands; a
separate commands directory would only add stubs. Only OpenCode needs wrappers.

**Windows:** `.claude/skills` is a Git symlink. Enable it with `git config core.symlinks true` (needs
Developer Mode or an elevated shell) and re-checkout; otherwise Git writes a one-line text file and
Claude Code sees no skills. The other hosts are unaffected.

## Role tiers

Explorer: fast, low-cost. Implementer: balanced, capable. Reviewer: balanced; escalate to a reasoning
tier only for demonstrated difficult issues. The main agent uses the host-configured model.

Role adapters pin no model (`model: inherit`; OpenCode V2 has no inherit value, so its roles omit
`model`), so a role file alone does not enforce a tier. The coordinator binds tiers at launch where the
host allows and says so when it cannot. Personal overrides belong in user config, for example in
`~/.config/opencode/opencode.json`: `{"agents": {"explorer": {"model": "<provider>/<fast-model>"}}}`.

## Host notes

- **OpenCode permissions** start from allow-all, so read-only roles deny `*` and re-allow what they
  need. The `.env` rules govern only `read`, so those roles get no `cat`/`head`/`tail`/`wc`, and
  `rg` on `.env` paths or with `--hidden` is denied. `opencode.json` asks before `database:migrate`,
  `drizzle-kit`, `supabase`, `git push|merge|reset --hard`, `gh pr merge`, and `npm publish`. These
  are approval prompts, not a sandbox.
- **Antigravity** `hooks.json` runs `hooks/safety-gate.mjs` (asks before migrations, Supabase,
  destructive git, pushes, merges, PR merges, publishing, recursive deletes, `sudo`, infrastructure
  changes) and `hooks/doc-reminder.mjs` (once per conversation; state in git-ignored `.agents/.state/`).
  Accept folder trust once, then check `/skills`, `/agents`, and `/hooks`.
- **Docs reminder** (all hosts): fires when code changed without a `docs/` update, in one or two
  lines, and adds the Express handbook pointer only for core files. Claude and Cursor look at the
  working tree; OpenCode and Antigravity also count commits on the branch. Requires Node.js and Git.
- The `api/.husky/` hooks are separate from these; `bin/diff.sh` needs Bash and Git.

## Maintain

Add a skill: create `.agents/skills/<name>/SKILL.md` (`name` equals the directory, one-sentence
trigger-based `description`); nothing else to register. Add a role: write `.agents/roles/<role>.md`,
then a pointer adapter per host. Change reminder rules only in `doc-reminder-rules.mjs`.
