# OpenCode host configuration

OpenCode-native equivalents of the repository's Claude Code and Cursor setup. `.claude/` and
`.cursor/` remain the canonical sources for those hosts and are not modified by anything here; the
files below are ports, except the OpenCode-only `/design` command, so keep them in sync when a role, command, or hook changes upstream.

OpenCode V2 picks the directory contents up automatically. The repository-root `opencode.json` only
adds approval prompts; it does not register agents, commands, or the plugin.

| Path | What it is | Source of truth |
| --- | --- | --- |
| `.opencode/agents/explorer.md` | Read-only mapping/search subagent | `.claude/agents/explorer.md`, `.cursor/agents/explorer.md` |
| `.opencode/agents/implementer.md` | Scoped implementation subagent | `.claude/agents/implementer.md`, `.cursor/agents/implementer.md` |
| `.opencode/agents/reviewer.md` | Independent review subagent | `.claude/agents/reviewer.md`, `.cursor/agents/reviewer.md` |
| `.opencode/commands/onboard.md` | `/onboard` | `.claude/commands/onboard.md` |
| `.opencode/commands/design.md` | `/design` | OpenCode-only command |
| `.opencode/commands/plan.md` | `/plan` | `.claude/commands/plan.md` |
| `.opencode/commands/implement.md` | `/implement` | `.claude/commands/implement.md` |
| `.opencode/commands/ship.md` | `/ship` | `.claude/commands/ship.md` |
| `.opencode/plugins/doc-reminder/index.mjs` | Docs reminder, ported from the Stop hooks | `.claude/hooks/doc-reminder.mjs`, `.cursor/hooks/doc-reminder.mjs` |
| `opencode.json` | Approval prompts for migrations, vault/database writes, publishes, and pushes | `AGENTS.md` safety boundaries |

## Deliberate differences from the Claude/Cursor files

- **Agents** use OpenCode frontmatter (`description`, `mode`, `permissions`) instead of `name`,
  `tools`, `readonly`, and `model: inherit`. The agent ID comes from the file name, so `name` is
  dropped. `tools:` becomes `permissions:` rules. The role's model is omitted entirely: OpenCode
  inherits the caller's model when no `model` is set, which is what `model: inherit` means for the
  other hosts. No model names are pinned in this repository, per the adoption criteria.
- **Commands** carry over unchanged, except `/design`, which is OpenCode-only. Only `description`
  frontmatter and the Markdown body are used by OpenCode, so no rewrite was needed.
- **The docs reminder** is a session `context` hook, not a stop hook. OpenCode does not read
  `.claude/settings.json` or `.cursor/hooks.json`, and it has no shell-command stop hook. The
  plugin appends a system reminder before the first model request where the changes contain code
  but no recognized documentation update, at most once per session. It counts both uncommitted
  changes and commits on the current branch relative to the default branch, so it still works after
  the workflow's per-unit commits. It is a no-op outside a git repository and needs Node.js and Git
  on `PATH`.
- **Skills are not duplicated.** OpenCode reads `.claude/skills` natively, so `adr-writer`,
  `diagnosing-bugs`, `grill-me-with-doc`, `implementation-planner`, `pr-prep`, and `tdd` (plus the
  `tdd` reference files) are already available. Copying them into `.opencode/skills` would only add
  a second copy to keep in sync.
- **`CLAUDE.md` and `.cursor/rules` are not ported.** OpenCode reads `AGENTS.md` only, and that file
  already carries the shared workflow and safety boundaries.

## Model tiers

`docs/standards/agent-routing.md` asks for a fast tier for exploration and a balanced tier for implementation
and review, but the roles deliberately do not pin model names. Bind them per user instead, in your
own `~/.config/opencode/opencode.json`, and confirm with `opencode debug agents` that the role keeps
its prompt and takes the model:

```jsonc
{
  "agents": {
    "explorer": { "model": "<provider>/<fast-model>" },
    "implementer": { "model": "<provider>/<balanced-model>" },
    "reviewer": { "model": "<provider>/<balanced-model>" }
  }
}
```

Treat these as personal settings, not repository policy: a shared repository cannot assume which
providers a contributor has.

## Safety notes

Every OpenCode agent starts from an allow-all base policy, so the read-only roles deny `*` first and
then re-allow only what they need.

- `explorer` allows reads, glob, grep, and a read-only shell allowlist (`git status|diff|log|show|rev-parse|ls-files|blame`,
  `rg`, `ls`). Anything else — edits, other shell commands, web access, skills, MCP tools, Code Mode
  — is denied or asks before use. Add prefixes to its `permissions` list if mapping needs more,
  rather than removing the fallback `ask`.
- `reviewer` allows reads, glob, grep, the read-only git commands, and the repository's own checks
  (`npm test`, `npm run lint|typecheck|build|format:check`, `bash bin/check-agent-workflow.sh`,
  `bash bin/check-opencode-config.sh`, `bash bin/diff.sh`, `node --check`). Other shell work asks.
  Edits, subagents, the common history-changing git commands, `npm publish`, `rm`, and web/MCP
  access are denied. Reading outside the repository asks, so it can review a sibling worktree after
  approval.
- `implementer` keeps the default policy; it only loses the ability to launch subagents.

Secret files: the `.env` rules only govern the `read` action, so the read-only roles do not get
content-printing shell commands (`cat`, `head`, `tail`, `wc`), and `rg` against a `.env` path or with
`--hidden` is denied. Read `.env` files through the `read` tool, which asks first.

`opencode.json` makes these ask before running: `database:migrate`, `drizzle-kit`, `supabase`,
`git push`, `git merge`, `git reset --hard`, `gh pr merge`, and `npm publish`. That is an approval
prompt, not a sandbox; agents still act on `AGENTS.md` for scope.

MCP servers configured at the user or parent-directory level are outside that boundary for the
implementer only; the read-only roles cannot call them.

## Verifying

- `node --check .opencode/plugins/doc-reminder/index.mjs` parses the plugin; it is plain ESM with no
  build or type-check step, like the hooks it ports.
- `/onboard`, `/design`, `/plan`, `/implement`, `/ship` should appear in the command list.
- `explorer`, `implementer`, and `reviewer` should appear in the subagent catalog.
- Make a code change without touching docs; the next model request should carry a "Docs reminder"
  system line, once per session. Repeat after committing the change.
- `bash bin/check-opencode-config.sh` covers the same ground without credentials, and the
  `OpenCode config` workflow runs it on pull requests. `bin/check-agent-workflow.sh` covers adapter
  parity and local links, and also runs `bin/check-backend-docs.sh`.
