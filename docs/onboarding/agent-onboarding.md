# Agent onboarding

Read in this order:

1. AGENTS.md for repository workflow and boundaries.
2. [docs/README.md](../README.md) for the project constitution, reading order,
   and documentation ownership.
3. docs/project-context.md for product intent, constraints, and known unknowns.
4. agent-metadata.md for verified technical state and unknowns.
5. Relevant docs/work/<item>/ and docs/adr/ entries for the current task.
6. [Agent routing](../agent-routing.md) for the host-neutral role tiers and how
   the coordinator binds available models before delegation.

## FelOps first run

1. Read the [documentation entry](../README.md), [architecture](../architecture.md),
   [database design](../database.md), and [delivery](../delivery.md). These
   describe planned flows; inspect code to establish behavior.
2. Run `npm ci --prefix api --ignore-scripts` from the root. This uses the existing
   lockfile without installing Git hooks or changing local hook configuration.
3. Run `bash bin/check-agent-workflow.sh` and, when you touch the host config,
   `bash bin/check-opencode-config.sh`; then run the relevant backend commands in
   `AGENTS.md`. Do not infer that passing workflow checks means app tests pass.
4. For server startup, obtain bootstrap credentials through the team's existing
   secure process. `api/.env.example` documents the variable names. Never commit
   values or request access merely to verify this framework.
5. The only implemented HTTP route is `GET /api/v1/health`; the MCP runtime is
   planned as an embedded module in `api/` and has no code yet. Verify the source
   again when taking a product task.

Keep architecture and database design in their canonical files under `docs/`.
Work records under `docs/work/` link to these designs and describe the change;
update the canonical files in place. Follow the [delivery sequence](../delivery.md)
for substantial flow designs and [API setup](../../api/README.md) for the pending
Apidog contract and mock handoff. AI Service implementation belongs in the
separate AI repository.

If you work in OpenCode, read [.opencode/README.md](../../.opencode/README.md) for
the ported agents and commands, the approval prompts in `opencode.json`, and the
docs-reminder behavior.

## Working habits

- Inspect the actual repository before describing its stack, entry points, commands, or integrations. Treat anything unsupported by evidence as Unknown.
- Use an available read-only agent for broad mapping when it will save time; otherwise inspect relevant files directly.
- A clear request authorizes the work it describes. Clarify only meaningful ambiguity. Planning organizes substantial work; it does not require redundant approval.
- Keep a feature brief, plan, and verification notes together in one docs/work/<issue-id-or-short-slug>/ folder when the change is substantial.
- Use a fresh reviewer for substantive changes when available. The implementer does not review its own work.
- Keep agent-metadata.md current when verified stack, architecture, integrations, or agent behavior changes.
- Do not create generic notes or archive folders. Keep durable decisions in docs/adr/.

## First requested task

Follow the request through the workflow in AGENTS.md. Do not implement product behavior during onboarding unless the user explicitly included implementation in the request.
