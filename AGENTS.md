# Repository instructions

Read this file first. Use docs/project-context.md for the current product and its constraints, and agent-metadata.md for verified technical and agent state. Treat missing or unverified facts as unknown; never infer a stack from the repository name.

## FelOps repository boundaries

- `api/` is the TypeScript / Express backend. Run its npm commands from `api/`
  or with `npm --prefix api`. The root is not an npm workspace.
- `mcp-server/` is a package placeholder with no implemented server. Its default
  `test` script intentionally fails; it is not a backend verification command.
- The AI Service lives in the separate `FelOps-platform/felops-ai` repository.
  Keep its FastAPI/LangGraph stack separate from this backend.
- Current executable behavior is the health endpoint and configuration scaffold.
  Architecture documents describe intended services; they do not prove those
  services exist. Read the relevant source before changing business behavior.
- The Backend saves agent rules; the planned MCP Server enforces them. Do not
  settle credential-vault access or rule synchronization implicitly: these remain
  open design questions in the team's documentation.

## Backend development and verification

```bash
# From the repository root; install without changing local Git hook configuration.
npm ci --prefix api --ignore-scripts
npm run lint --prefix api
npm run typecheck --prefix api
npm run build --prefix api
npm test --prefix api

# Credential-free checks for this agent workflow.
bash bin/check-agent-workflow.sh
bash bin/check-opencode-config.sh
```

- Startup and the existing health test import Infisical configuration. The test
  suite currently needs bootstrap credentials; see `api/.env.example` and
  `api/src/integrations/infisical/fetch-secrets.ts`. Report that limitation rather
  than inventing credentials or contacting a shared vault to verify documentation.
- Never run `database:migrate`, write to Supabase, connect integrations, or deploy
  as part of onboarding. Database commands load the same vault configuration.
- `api/.husky/` contains the existing pre-commit and pre-push hooks. Installing
  from the nested package does not by itself establish that Git uses those hooks.
  Preserve local `core.hooksPath`; run checks explicitly.
- Do not regenerate the lockfile, migrations, API specifications, or formatting
  across unrelated files while adopting or updating this workflow.

## Team design workflow

Use the team's **Design → Implementation → Deployment** sprint sequence. The
agent delivery loop below fits inside it and does not replace the team's design
documents or authorize deployment. For a substantial workflow, capture the main
sequence, endpoints, data model, important failure cases, and deferred scope.

`api/docs/` holds backend architecture, feature, and API design material.
`docs/` holds the shared coding-agent workflow and work records. Link to the
relevant backend document rather than duplicating it. Gaper's documentation
[PR #1](https://github.com/FelOps-platform/felops-backend/pull/1) is a pending
planning source; check its current merge state before citing its files as local
facts. Do not restructure its files as part of framework setup.

## Working with requests

- A clear request to build or change something authorizes work within that stated scope. Do not add an approval step just to repeat the request back.
- Clarify only when an ambiguity could materially change behavior, scope, or risk. Continue independent work while resolving it.
- Use a short plan for multi-file, feature-sized, or risky work. A plan organizes authorized work; it does not create a new approval gate. If the user asks for a plan only, stop after presenting it.
- Ask before expanding scope or taking consequential actions that the user has not explicitly authorized, including destructive operations, production changes, external messages, pushes, merges, and deployments. Routine local commits follow the standing authorization below.
- User instructions in the active conversation take precedence over general workflow suggestions here.

## Delivery workflow

1. **Clarify** meaningful uncertainties. For feature-sized work, capture the goal and acceptance criteria in a work brief.
2. **Explore** relevant code, project context, existing patterns, and applicable docs. Use an available read-only agent for broad mapping when useful; if unavailable, inspect targeted files yourself.
3. **Plan** substantial changes in docs/work/<issue-id-or-short-slug>/plan.md. Keep routine edits lightweight.
4. **Implement** the smallest complete change within the authorized scope. Follow the detected stack and established patterns.
5. **Verify** with focused checks that exercise the changed behavior. Report commands and results accurately.
6. **Review** substantive changes with a fresh reviewer when one is available. Otherwise review the diff yourself and state that clearly.
7. **Prepare to ship** with the pull-request template and evidence. Perform external Git or deployment actions only when explicitly requested.

## Commit completed work as you go

- Commit each completed, coherent unit of work promptly after its relevant checks and any required review pass. A finished feature slice, fix, documentation update, or setup block is a checkpoint; do not leave several finished units uncommitted until the end of the session.
- Routine local commits of completed work are already authorized. Do not ask for confirmation each time. A request for a plan or read-only review still limits the task to that scope.
- Before committing, update relevant project documentation, inspect the working tree, stage only the paths or hunks belonging to the completed unit, review the staged diff for correctness and secrets, and run the focused checks. Include all changes only when the user explicitly requests that scope. Preserve other contributors' unfinished work.
- Keep commits small and meaningful with a clear message describing the result. Do not commit every keystroke, incomplete work, failing checks, credentials, generated private artifacts, or unrelated edits. Report an actual blocker instead of marking unfinished work complete.
- Verify each commit and report its hash and any remaining work. Do not amend or rewrite published history without explicit authorization.
- Local commit authorization does not itself authorize a push, merge, or deployment. When the user has already requested one of those actions, complete it within that scope without asking again, synchronize with the latest remote state first, and verify the result.

## Keep the local default branch current

When the repository has a remote and a shared default branch, this is required. If there is no remote, skip it.

- At every session start, refresh remote state and safely update the local default branch to include the latest remote commits. Before creating any feature branch or worktree from local main/default, refresh remote state and ensure the local default includes those commits. Also refresh at checkpoints and before handoff. Routine fetches and safe fast-forwards are already authorized; do not ask each time.
- Resolve the default branch from `origin/HEAD`; fall back to the branch named by the remote, then `main`, then `master`. Do not assume a branch name.
- If the default branch is checked out and clean, use `git pull --ff-only`.
- If it is not checked out, use `git fetch origin <default>:<default>` without force.
- If it is checked out in another worktree, update it only when that worktree is safe and coordinated; never bypass Git's protection. If it cannot be safely updated, do not create a branch or worktree from stale local state; preserve work and report the blocker.
- If it has unfinished changes or local and remote history diverges, preserve the files and report the blocker. Do not create a branch or worktree from stale local state; never force a fast-forward failure through.
- Compare an active feature branch with the latest `origin/<default>` before shipping. Integrate upstream changes when safe, run relevant checks, and preserve other contributors' work.
- Never discard edits, reset history, automatically stash work, force-update a branch, or perform an unsolicited push or merge to make synchronization succeed. Report any remaining blocker.
- This is a workflow rule, not a background scheduler.

## Project documentation

- docs/project-context.md describes product goals, constraints, terminology, and known unknowns.
- docs/onboarding/agent-onboarding.md is the entry point for a new contributor; docs/ai-engineering-rules.md applies when changing an LLM-backed feature.
- agent-metadata.md records verified stack, architecture, integrations, and agent behavior. Update it when those facts change.
- Significant work gets one folder in docs/work/ containing the brief, plan, and optional verification notes. Use an issue identifier when one is supplied; otherwise use a short descriptive slug.
- Use the lifecycle Draft → Planned → In Progress → Done. Record a blocking decision as Awaiting input. Mark work Done only after its acceptance criteria and relevant verification are complete.
- Record durable architecture decisions in sequential docs/adr/ entries. Do not create ADRs for routine, reversible choices.
- Keep formal change records with their work folder; keep personal scratch notes and raw private evidence outside this repository. Do not create a generic notes or archive area.

## Agent tools and skills

The host agent may use its native subagents and tools. Do not assume a particular provider, model name, or agent configuration is available. Claude Code, Cursor, and OpenCode project roles are defined under their respective directories. Follow [docs/agent-routing.md](docs/agent-routing.md): explorers use a fast, low-cost tier; implementers and independent reviewers use a balanced tier. Resolve the host's supported models and bind tiers when possible; document inheritance-only limitations. Native role frontmatter stays at `model: inherit` for Claude Code and Cursor; OpenCode V2 has no inherit value, so its `.opencode/agents` roles omit `model` to inherit the caller's model.

Available repeatable workflows live in the host adapters: `.opencode/commands` and `.claude/commands` provide onboard, plan, implement, and ship, and skills under `.claude/skills` (shared by OpenCode) and `.cursor/skills` cover clarification, implementation planning, ADRs, TDD, bug diagnosis, and pull-request preparation.

## Local helper requirements

The configured documentation reminder hooks require Node.js and Git on PATH. The bin/diff.sh review helper requires Bash and Git. These development tools do not establish the application's runtime or stack.

## Safety and accuracy

- Never commit secrets or expose credentials in logs or documentation.
- Do not claim tests, reviews, external changes, or product facts that were not verified.
- Preserve unrelated user changes. Keep edits focused and review the final diff before reporting.
- For authentication, authorization, personal data, billing, or security-sensitive behavior, inspect the relevant code and constraints carefully; ask if a material decision is unresolved.
- Follow repository-specific and user-provided limits for tests, tools, and external access.
