# Coding-agent workflow

This repository adopts the clean Agent Seed workflow: clarify → explore → plan →
implement → verify → independent review → prepare a PR. `AGENTS.md` is the shared
rulebook. Claude Code and Cursor have native adapters; other hosts can use their
own tools and subagents.

## Start work

Read [agent-onboarding.md](agent-onboarding.md), the
[project context](../project-context.md), and [verified metadata](../../agent-metadata.md).
Use `/onboard`, `/plan`, `/implement`, and `/ship` in hosts that support the
included commands. In other hosts, follow the same steps from `AGENTS.md`.

For substantial changes, copy the [brief](../templates/feature-template.md) and
[plan](../templates/implementation-plan-template.md) into one `docs/work/<item>/`
folder. Use a supplied issue ID or a short task name. Link existing backend
designs in `api/docs/`. Durable architecture decisions go in `docs/adr/`.

The team's Design → Implementation → Deployment process remains the sprint
structure. Work briefs capture the sequence, endpoints, data, important failures,
and deferred scope needed for workflow LLDs. Deployment requires its own
authorization; completion of a coding task does not initiate it.

## Verify and review

Run `bash bin/check-agent-workflow.sh` from the root to validate adapters and
helper syntax. The GitHub workflow runs these same credential-free checks; it
does not certify application behavior. Use the backend commands in `AGENTS.md`
for product changes and report environment limitations accurately.

The stop hooks inspect the current working tree. Code-only changes trigger a
documentation reminder; updates to root project/work/ADR records or `api/docs/`
satisfy it. Claude's reminder is informational; Cursor may request a follow-up
with a bounded loop. Neither reminder replaces review or proves docs are correct.

Open the repository root in the host. Claude's configured launcher uses its
project-root placeholder in an argument vector, so it still loads after changing
into `api/`. Cursor project hooks run from the project root; its configured
command is relative to that root. The scripts themselves resolve Git paths from
their current working directory. See the official
[Claude hook reference](https://code.claude.com/docs/en/hooks#reference-scripts-by-path)
and [Cursor hook configuration](https://cursor.com/docs/hooks#configuration).

Use a reviewer who did not implement the change, and prepare the PR with
`.github/PULL_REQUEST_TEMPLATE.md`. Run `bash bin/diff.sh` for working-tree and
untracked files; use `git diff --cached` for staged changes.

Use the [routing policy](../agent-routing.md) before delegation: fast explorers,
balanced implementers and independent reviewers, with reasoning escalation for
demonstrated difficult review issues. The coordinator maps tiers to available
models using host-supported controls. Native `model: inherit` declarations alone
do not enforce the tier; document that limitation if the host only supports
inheritance.

## Maintain the framework

This is a repository adaptation of clean Agent Seed commit `27bb548`, including
the role-tier policy added to the original `40d423c` baseline. It carries workflow files and templates,
with FelOps-specific context and checks. Keep the shared roles, commands, and
skills aligned across both host adapters. Hooks have different native output
protocols. Update verified metadata when the code or development setup changes.

No installer is installed into this repository: future updates should be reviewed
as normal changes rather than reinstalling over the project. No application
runtime dependency is added by this workflow.
