# GitBook style guide

## Audience

Write for the frontend, AI Service, and product/QA teams. They need behavior, contracts, and
states — not repository setup. Backend commands, schema internals, ADRs, and implementation
notes stay in the repository.

### Audience isolation

Each page mentions only the tools and settings its audience uses.

- **Frontend pages:** browser behavior, cookies, CORS symptoms, and client request patterns.
  No `CORS_ORIGINS`, `TRUST_PROXY`, `NODE_ENV`, database details, deployment commands, or
  proxy hop counts.
- **API pages:** contract-level behavior and error rules. No environment-variable names.
- **AI Service contract:** internal endpoints, payloads, and ownership. No frontend storage
  guidance.
- **System overview:** ownership and boundaries. No configuration.

When a dependency crosses teams, state the outcome rather than the mechanism:

| Avoid | Prefer |
| --- | --- |
| Add the origin to `CORS_ORIGINS`. | The API allows the frontend origin. |
| Match `TRUST_PROXY` to the topology. | The deployment preserves client IPs for rate limits. |
| Set `COOKIE_SECURE` in production. | Production cookies require HTTPS. |

## Page anatomy

1. `# H1` page title.
2. One sentence that says what the page covers.
3. A status line when the page is not an overview.
4. The core content: endpoints, rules, states, and errors.
5. A short link to the next relevant page.

Parent pages are short overviews with a table of their children. They do not repeat child
content.

## Status labels

Use exactly these labels:

| Label | Use |
| --- | --- |
| `**Status: Implemented.**` | Live routes; link the Apidog reference. |
| `**Status: Planned.**` | Designed feature behavior; no endpoints are live. |
| `**Status: Planned contract.**` | Service-to-service contract; no runtime. |

Avoid "currently", "for now", "will be", and "coming soon". The label carries the timing.
On planned pages, say once that the endpoints are not live and are not in Apidog yet.

## Writing

- Write declaratively: describe how the system behaves and what is required. Do not address
  the reader in the second person.
  - Prefer "The access token is held in memory" over "Keep the access token in memory."
  - Prefer "A dev proxy keeps the cookie first-party" over "Use a dev proxy."
  - Prefer "The API allows the frontend origin" over "Add the origin to `CORS_ORIGINS`."
- Use present tense and active voice when a subject acts; use passive only when the actor is
  irrelevant.
- One idea per sentence. Prefer 20 words or fewer.
- Use **Backend**, **AI Service**, **frontend**, and **workspace** consistently.
- Use "sign-in" as a noun and "sign in" as a verb.
- Write "6-digit" and "10 MB".
- Avoid "simply", "just", "please", "note that", "make sure", "you should", "we recommend",
  and marketing adjectives.
- Endpoint purpose columns may use verb phrases ("Send a verification code"), but body prose
  stays declarative.
- Prefer concrete nouns and exact codes over vague references: `401 SESSION_EXPIRED`, not
  "an auth error".

## Formatting

- **Endpoint tables:** `Method | Path | Purpose`. Include the full client path.
- **Error tables:** `Status | Code | When`, or `Code | Status | When` when the page already
  establishes HTTP status.
- **State models:** Mermaid `stateDiagram-v2`.
- **Call sequences:** Mermaid `sequenceDiagram`.
- **Payloads:** fenced `json`, `jsonc`, `http`, or `ts`; do not use unlabeled fences.
- **Hints:** reserve for a real warning, status block, or the Apidog callout. Do not wrap
  normal paragraphs.
- **Links:** descriptive text, never "here". Use `/pages/<pageId>` for pages that have
  children; relative links break for those pages. A child page may not resolve a link to its
  own parent, so refer to the parent in prose. Use page IDs when in doubt.
- **Descriptions:** one sentence in frontmatter. Add `keywords` to top-level entry pages.

## API conventions

- Client routes live under `/api/v1`. Service routes are described separately.
- Client path parameters use camelCase: `{workspaceId}`, `{agentId}`, `{approvalId}`.
- AI Service paths use snake_case: `{workspace_id}`, `{conversation_id}`.
- Client JSON keys are camelCase. Query parameters, database columns, and enums are
  snake_case.
- Success uses `data`; paginated lists add `meta`; errors use `{ error: { code, details? } }`.
- Default pagination is `page=1`, `limit=20`, maximum `100`.
- Implemented routes are canonical in Apidog. Planned endpoints are not in Apidog; state
  that once per planned page or parent.
- Do not copy full OpenAPI schemas. Link Apidog and describe the rule, state, or error that
  the reader needs.

## Ownership and duplication

- **AI Service contract:** service payloads, `agent_config`, tool-call transport, approval
  webhook, ingestion jobs, catalog sync, events. Feature pages link here.
- **Feature pages:** client endpoints, product rules, state transitions, and expected errors.
- **Frontend guide:** token storage, refresh flow, CORS, cookies, and browser deployment.
- **Authentication:** endpoint list, session semantics, and auth error codes. Link the
  Frontend guide for client behavior instead of repeating it.
- **System overview:** service ownership and the boundary rule. No stack or request
  lifecycle.

If a fact appears on two pages, choose one owner and link from the other.

## Length

- Reference page: roughly 40–100 lines.
- Contract page: roughly 60–120 lines.
- Split a page when it covers two independent topics or exceeds about 120 lines.
- Prefer a table or a short list over a long paragraph.

## Review checklist

- [ ] Title, description, icon, and keywords are present.
- [ ] Status label is correct and unambiguous.
- [ ] Endpoints, fields, and error codes match the source document.
- [ ] Path casing follows the client/service rule.
- [ ] No backend configuration names appear in client-facing pages.
- [ ] Prose is declarative; no second-person instructions or assistant-style phrasing.
- [ ] Apidog is linked where implemented behavior is described.
- [ ] No broken links, `broken-reference`, `@@`, or `%%%` tokens remain.
- [ ] No contract block is duplicated from another page.
- [ ] Heading case is sentence case; terminology is consistent.
- [ ] The page reads well on its own and links to the next step.

## Update triggers

Update GitBook when:

- a client route, request schema, response envelope, or error code changes;
- a feature design changes state, rules, or endpoints;
- the AI Service contract changes a path, payload, token, event, or ownership rule;
- cookie, CORS, proxy, or session behavior changes;
- an implemented feature moves from planned to live, or a new audience appears.

## GitBook mechanics

- Edit through a change request; never edit published content directly.
- Read pages with `computed: false` and `format: markdown` inside the change request.
- Use `compat: false` on `updateChangeRequestContent`.
- Insert parents before children; use `into` with the parent page ID.
- Use `ref` on inserted pages when another page in the same batch links to them.
- After merging, verify `get_site_structure` and `listPages`.
