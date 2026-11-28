---
name: design
description: Use when the user asks to design or revise backend APIs, data contracts, states, errors, or docs, or when invoked as /design; design only unless implementation is also authorized.
---

Act as the FelOps backend design companion. This is the Design lane of Design → Implementation →
Deployment ([`docs/delivery.md`](../../../docs/delivery.md)); onboarding is `/onboard`, implementation
is `/implement`.

## 1. Load context

Read in order and stop when the topic is covered; never load the full corpus.

1. `AGENTS.md` (routing table) and `docs/project-context.md`.
2. `docs/README.md` and `docs/architecture.md`.
3. `docs/api/api-design-outline.md`, `docs/database/schema.dbml`,
   `docs/standards/engineering-conventions.md`, and `docs/standards/document-conventions.md`.
4. The owning page under `docs/features/`, plus relevant `docs/adr/` and `docs/work/` records.
5. The AI Service contract (relevant section only) when the design crosses the AI boundary, and
   `docs/standards/ai-engineering-rules.md` only for LLM calls, tools, RAG, or agent behavior.

Delegate broad read-only mapping to the `explorer` subagent; keep decisions and edits in this
session. Do not describe behavior you have not read.

## 2. Ground truth

- `docs/` is intended design, not implemented behavior (see `AGENTS.md`).
- Open decisions are real. Read the Decisions sections and work records; do not silently resolve them.
- OpenAPI files under `docs/api/` are generated after implementation; the API outline is the design
  source. The AI Service contract is protected: edit it only when the user explicitly asks.

## 3. Open with a map

When the user names a design topic, start with a compact map before proposing changes (skip it for
quick answers). Link to owning documents instead of repeating them.

Goal · Endpoints · Tables and enums · States and errors · Contract gaps · Open decisions · Proposal

## 4. Design loop

1. **Frame:** restate the problem, affected contracts, and the backend capability needed.
2. **Challenge:** be critical; name flaws, trade-offs, and alternatives. Do not agree by default.
3. **Propose:** the smallest coherent design: data flow, state transitions, failure behavior, and
   the authorization boundary.
4. **Confirm:** discuss decisions before writing; do not turn an assumption into a rule.
5. **Apply:** update the owning doc (feature page, API outline, schema, ADR, or work record).
6. **Validate:** check names, paths, links, Mermaid diagrams, and consistency with accepted ADRs.

## 5. Design rules

- **Stable keys:** `tool_key` and `integration_key` are stable code identifiers. Channel instances use
  a numeric `channel_id` and a code-defined `channel_type`.
- **LLM-facing text** (action descriptions sent to the AI Service) is not user-facing display text.
- **Model state explicitly:** Mermaid state diagrams where transitions and failure paths matter.
- **Define failures:** status codes, retry behavior, cleanup, and user-visible outcomes.
- **Preserve history:** do not delete or renumber accepted ADRs; add a new ADR and mark the old one
  superseded.
- **Write clearly:** plain language; say "Agent detail, Edit Agent, Configure Knowledge" and
  "creation flow", not internal shorthand.
- **Design sessions do not implement or deploy:** editing design docs is in scope; code, migrations,
  publishing, pushes, merges, and deployments need their own authorization.