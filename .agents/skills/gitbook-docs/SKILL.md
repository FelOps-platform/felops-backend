---
name: gitbook-docs
description: Use when updating the FelOps GitBook documentation, adding or revising pages, or syncing API, feature, frontend, or AI Service contract changes into GitBook.
---

# FelOps GitBook docs

GitBook is the cross-team surface for frontend, AI Service, product, and QA. It is not a
mirror of the repository: backend setup, contributor commands, database internals, and ADRs
stay in `docs/` and `AGENTS.md`.

- **Site:** Felops Docs (`site_F1RGC`, org `k62b4oz1dU3nZRVXR8Ox`)
- **Space:** Documentation (`eAOdfXZSLVxbnMEHwQwP`)
- **Apidog:** <https://i6xycwic1n.apidog.io> — also the site's **API Reference** nav link
- **Page map:** [references/page-map.md](references/page-map.md)
- **Style rules:** [references/style-guide.md](references/style-guide.md)

## Before editing

1. Name the audience: frontend, AI Service, product/QA, or shared.
2. Find the source of truth:
   - Implemented routes: `api/` and `docs/api/openapi.client.yaml`.
   - Feature designs: `docs/features/<feature>.md`.
   - AI boundary: `docs/ai-service-integration/ai-service-contract.md`.
   - Browser behavior: `docs/development/frontend-integration.md`.
   - Product context: `docs/project-context.md`.
3. Confirm the status: **Implemented**, **Planned**, or **Planned contract**. Never present
   planned behavior as live.
4. Read the current page in GitBook; do not rely on the page map alone. Resolve IDs with
   `listPages` because recreated pages get new IDs.

## Update workflow

1. `create_change_request` on the Documentation space.
2. `listPagesInChangeRequest`, then read the target page with
   `getPageInChangeRequestById` (`computed: false`, `format: markdown`).
3. Apply changes with `updateChangeRequestContent` (`compat: false`). Up to 50 changes per
   batch; create parents before children when inserting.
4. Verify every page for `broken-reference`, leftover placeholders, status labels, and link
   targets.
5. Merge with `submit_or_merge_change_request`, then confirm with `get_site_structure` and
   `listPages`.

Never edit published content directly. Every edit goes through a change request.

## Hard rules

- **Apidog:** implemented routes are canonical in Apidog. Link it from the home, API,
  Authentication, Workspaces, and Frontend guide pages. Planned endpoints are not in Apidog;
  say so once.
- **Status:** implemented pages start with `**Status: Implemented.**`; planned features with
  `**Status: Planned.**`; AI contract pages with `**Status: Planned contract.**`
- **Audience:** no Quickstart, backend development, database model, or contributor pages.
  Repo-only material stays out.
- **Audience isolation:** client-facing pages describe browser behavior and API outcomes only.
  No backend environment variables, proxy hop settings, database details, or operator commands.
  State dependencies as outcomes ("the API allows the origin"), not configuration
  ("add `CORS_ORIGINS`").
- **One job per page:** split unrelated topics (for example catalog sync and events). Parent
  pages are short overviews, not duplicates of their children.
- **Single source of truth:** `agent_config` and service payloads live in the AI Service
  contract. Feature pages link to them instead of copying them.
- **Links:** use `/pages/<pageId>` for pages that have children. Relative `./page.md` links
  break for parent pages, and a child page may not resolve a link to its own parent; refer to
  the parent in prose instead. Use IDs for all internal links when in doubt.
- **Paths:** client routes use camelCase placeholders (`{workspaceId}`); AI Service routes use
  snake_case (`{workspace_id}`).
- **Voice:** declarative and system-focused. Describe what happens, what is required, and what
  options exist. No second-person commands ("you", "keep", "send", "make sure"), no chatty
  transitions, and no assistant-style phrasing. Procedures use third-person subjects
  ("The client sends...").
- **Metadata:** every page needs a one-sentence `description`, an icon, and useful `keywords`
  on top-level pages.

## Done checklist

- [ ] Audience and status are clear at the top.
- [ ] Endpoints, rules, and errors match the source document.
- [ ] No backend configuration names appear in client-facing pages.
- [ ] Prose is declarative (see style guide).
- [ ] No broken links or placeholder tokens.
- [ ] Apidog is linked where implemented behavior is described.
- [ ] No duplicated contract block.
- [ ] The page is no longer than it needs to be; multi-topic pages are split.
- [ ] Titles and headings are sentence case; terminology is consistent.
