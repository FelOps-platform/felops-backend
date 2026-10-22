# Add an OpenCode host configuration

Status: Done
Created: 2026-10-22

## Goal

Give contributors who use OpenCode the same repository agents, commands, and
documentation reminder that Claude Code and Cursor users already have, without
touching the existing `.claude/` and `.cursor/` surfaces.

## Acceptance criteria

- [x] `.opencode/agents` provides explorer, implementer, and reviewer roles with
      repository-consistent prompts and OpenCode V2 frontmatter.
- [x] `.opencode/commands` provides `/onboard`, `/plan`, `/implement`, and `/ship`
      matching the Claude Code command text.
- [x] A `.opencode/plugins` plugin ports the Stop-hook docs reminder to a
      documented OpenCode hook, with the same path classification, and also
      counts committed branch work so per-unit commits do not hide it.
- [x] Read-only roles cannot reach secret files through shell commands, and
      repository-consequential commands ask before running.
- [x] `.claude/` and `.cursor/` are unmodified; skills are read natively from
      `.claude/skills` rather than duplicated.
- [x] The OpenCode roles load, and the plugin loads without a transform failure.
- [x] The docs reminder emits once per session on code-only changes and stays
      silent when a recognized doc changed or no code changed.
- [x] Central routing guidance states how OpenCode inherits a role's model.

## Scope

Development workflow configuration only. This does not change backend code,
dependencies, migrations, or the product's planned AI Service. `.claude/` stays
canonical for the roles and commands; the OpenCode files are ports kept in sync
by the workflow check.
