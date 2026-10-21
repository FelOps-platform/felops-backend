# Adopt Agent Seed for FelOps Backend

Status: Done
Created: 2026-10-22

## Goal

Give contributors and coding agents a shared, repository-specific workflow for
planning, implementation, verification, review, and pull-request preparation.
Adopt the clean Agent Seed framework while preserving the existing backend and
the team's Design → Implementation → Deployment sprint workflow.

## Acceptance criteria

- [x] Root instructions describe the actual `api/` and `mcp-server/` boundaries.
- [x] Claude Code and Cursor adapters provide roles, commands, skills, and hooks.
- [x] Explorers target a fast tier and implementers target a balanced tier through
      host-supported routing, with no model names pinned in the repository.
- [x] Project context and metadata distinguish implemented behavior, planned work,
      and unresolved design questions, with sources.
- [x] Work, ADR, onboarding, and PR templates are usable for backend contributors.
- [x] Framework checks and independent review pass; existing backend check results
      and limitations are recorded accurately.
- [x] The reviewed integration and PR description are prepared for a local commit against `main`.

## Scope

This change adds development workflow and documentation. It does not implement
business endpoints, an MCP runtime, database migrations, AI orchestration, or
deployment. Existing `api/docs/` material remains in place. Documentation PR #1
is considered for compatibility but is not merged or treated as implementation.

Publishing is deferred: the account currently has read access and private forks
are disabled; the requester selected local preparation for now.
