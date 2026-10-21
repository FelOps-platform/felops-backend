---
name: grill-me-with-doc
description: Clarify a vague feature/request by grilling requirements, then produce a feature document or issue-ready brief.
---

# Grill Me With Doc

Use before implementation when requirements are unclear, feature-like, or high-risk.

## Ask about

- Business goal and target user/persona.
- Current pain and expected behavior.
- In scope and out of scope.
- Acceptance criteria.
- UI/API/data model needs.
- Permissions, privacy, and security concerns.
- Edge cases, examples, screenshots, and priority.

## Output

Create or update `docs/work/<issue-id-or-YYYY-MM-DD-slug>/feature.md` using
`docs/templates/feature-template.md` (one folder per unit of work — see `docs/work/README.md`).
If the work is tracked as a ticket, you may instead put the brief in the issue body in your
tracker and reference it from the work folder. Skip the doc entirely for trivial, low-risk changes.

Prefer concise questions first; do not overwhelm the user with every possible question if some
are irrelevant.
