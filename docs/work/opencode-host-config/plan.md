# OpenCode host configuration plan

Status: Done
Created: 2026-10-22
Feature brief: [brief.md](brief.md)

## Evidence and boundaries

- OpenCode V2 discovers agents in `.opencode/agents`, commands in
  `.opencode/commands`, plugins in `.opencode/plugins`, and reads `.claude/skills`
  as a project compatibility source. It reads `AGENTS.md`, not `CLAUDE.md`.
- Source of the ports: `.claude/agents/`, `.claude/commands/`, and
  `.claude/hooks/doc-reminder.mjs`, mirrored in `.cursor/`.
- `.claude/` and `.cursor/` are read-only for this change.
- `bin/check-agent-workflow.sh` stays credential-free and only reads files and a
  temporary git repository.

## Steps

1. Port the three roles, translating `tools:` and `readonly` into V2
   `permissions` and omitting `model` so each role inherits the caller's model.
2. Since every OpenCode agent starts allow-all, deny `*` first in the read-only
   roles, then re-allow reads and the shell allowlists, repeating the `.env` read
   rules so secrets still prompt. Because those rules only govern `read`, keep
   content-printing shell commands off the allowlist and deny `rg` over `.env`
   paths or with `--hidden`.
3. Copy the four commands unchanged and keep them byte-identical to
   `.claude/commands`.
4. Port the docs reminder to a session `context` hook that appends a system
   reminder once per session, reading the worktree fresh on each request and
   counting commits on the current branch relative to the default branch, so
   per-unit commits do not silence it before shipping.
5. Add a repository-root `opencode.json` that asks before migrations, Supabase
   and drizzle-kit writes, publishes, pushes, merges, and hard resets; these are
   the actions `AGENTS.md` forbids running unattended.
6. Document the host split in `.opencode/README.md`, `agent-metadata.md`, and the
   model-inheritance rule in `docs/standards/agent-routing.md` and `AGENTS.md`, including
   how a contributor binds model tiers in personal config.
7. Add a separate `bin/check-opencode-config.sh` for OpenCode parity, project
   approval rules, and plugin behavior, leaving `bin/check-agent-workflow.sh`
   unmodified so the Claude/Cursor checks keep their existing coverage.

## Verification

- `opencode debug agents` lists explorer, implementer, and reviewer as subagents with their
  permission arrays and no model; `opencode plugin list` shows the doc-reminder plugin loaded from
  `.opencode/plugins/doc-reminder/index.mjs`, with no transform failure in the service log.
- `bash bin/check-opencode-config.sh` checks OpenCode agent frontmatter, the
  secret-file rules, project approval rules, byte parity between
  `.claude/commands` and `.opencode/commands`, and drives the plugin through a
  fixture git repo: clean tree, code-only change, committed branch change,
  `docs/work` page, `.opencode`-only change, non-git directory, a repeated request
  in one session, and a second session. It passes on a clean archive of `HEAD`
  plus this change, and fails as intended when a command drifts, the deny-all
  rule is removed, `rg` over `.env` is re-allowed, an approval rule is dropped,
  the non-git guard is disabled, `docs/work` recognition is dropped, or
  committed-branch comparison is disabled. `bin/check-agent-workflow.sh` is
  unchanged by this work.
- In an earlier run, while a separate in-flight edit had temporarily deleted
  `api/docs/features/actions.md`, the existing Claude/Cursor check stopped on that
  missing link; with `api/docs` restored it passes.
- The OpenCode checks run in CI through `.github/workflows/opencode-config.yml`;
  the existing `Agent workflow` job is unaffected.
- Two independent review passes. The first requested changes on capability scope,
  the reviewer shell policy, the reminder cache, and stale routing guidance; the
  second passed, with follow-ups on the check's non-git assertion, plugin typing,
  README wording, and these notes. All follow-ups were resolved, and the
  capability findings were closed further by removing shell paths to secret files
  and adding project approval rules.
