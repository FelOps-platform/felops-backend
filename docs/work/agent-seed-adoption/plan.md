# Agent Seed adoption plan

Status: Done
Created: 2026-10-22
Feature brief: [brief.md](brief.md)

## Evidence and boundaries

- Base: `origin/main`, commit `f55729468809abdfbcf75b351e11e8abd851073c`.
- Seed: local clean Agent Seed, commit
  `40d423cadf2581608a72b218c9af010a8edbdaee`, plus its tier-policy update `27bb548`.
- Source of commands and implementation: `api/package.json`, `api/src/`,
  `api/tests/`, `mcp-server/package.json`, and `api/docs/`.
- Pending team documentation:
  <https://github.com/FelOps-platform/felops-backend/pull/1>.
- All application files, dependency manifests, migrations, and existing docs are
  outside the write scope of this integration.

## Steps

1. Install the seed with its existing-repository installer, preserving Git history
   and existing files.
2. Fill technical metadata and product context from the repository and explicitly
   identified planning sources.
3. Adapt root guidance, onboarding, templates, and host reminders to the nested
   backend layout and team sprint workflow.
   Carry the requested role-tier policy from the canonical seed: fast explorers,
   balanced implementers and independent reviewers, resolved by each host rather
   than pinned model names. Document inheritance-only host limitations.
4. Add a small credential-free workflow check and GitHub Actions job. Keep
   application verification separate from framework validation.
5. Run framework checks and available backend checks; record baseline failures
   without silently changing application behavior or requesting credentials.
6. Obtain independent review, resolve findings, check compatibility with PR #1,
   and commit the finished local integration with a prepared PR description.

## Verification

- Framework: syntax/configuration, adapter parity, referenced local files, hook
  behavior from both root and `api/`, and no template-project residue.
- Backend baseline: locked dependency installation, lint, typecheck, build, and
  existing test command where available. Never contact a vault or database to
  make this development-workflow change pass.
- Scope: existing tracked application files remain byte-for-byte unchanged.
- Compatibility: trial merge of PR #1 in a temporary index, without changing
  this branch or the main checkout.
- Review: a fresh reviewer who did not implement this change.

## Risks and rollback

The seed is development tooling, with no runtime dependency. Hooks should remain
bounded reminders; project guidance must not present planning documents as
implemented features. Revert the integration commit to remove the framework.
Publishing and merging are separate from this local preparation.

## Completion evidence

The framework checks, configured-launch fixtures, and independent review passed.
The compatibility trial against PR #1 was clean, and application files are
unchanged. API lint, typecheck, and build passed; the pre-existing health suite
fails before collecting tests without Infisical bootstrap credentials. See
[qa.md](qa.md) for exact evidence and [pull-request.md](pull-request.md) for the
prepared PR description. Local preparation is complete; publishing is deferred.
