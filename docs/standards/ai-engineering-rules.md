# AI and agent engineering rules

Read this when building or changing an LLM-backed feature, tool, RAG system, or multi-agent workflow. These rules supplement AGENTS.md. They do not imply that this repository uses AI or any particular provider.

## 1. Providers and credentials

- Keep provider calls behind a small adapter so configuration can change without rewriting application behavior.
- Load credentials from the approved runtime secret store or environment configuration. Never hardcode or invent credentials.
- Use only providers, services, and data flows that the user or project context has authorized.

## 2. Tool design

1. Explain when a tool should and should not be used.
2. Use specific parameter names and strict input/output schemas.
3. Return structured results and errors. Separate validation, permission, business-rule, transient, and unknown failures.
4. Add deterministic checks for sensitive actions; do not rely on a model to enforce access or policy.
5. Keep tool documentation current when behavior changes.

## 3. Structured output and evidence

- Validate important outputs against a schema.
- Represent missing source values as unknown or null; do not guess.
- Preserve source references and dates for retrieved claims.
- Keep conflicting claims distinct with their source and date.
- Require human review where privacy, safety, or impact warrants it.

## 4. Human handoff

Escalate when a decision is outside the user's authorization, a destructive or production action is involved, confidence is low on a high-impact choice, required data is missing, or a tool failure blocks safe completion. Hand off the issue, context, completed work, blocker, proposed next step, and supporting evidence.

Never state that an action succeeded if a tool failed.

## 5. Memory and retrieval

- Keep temporary task state separate from durable project facts.
- Store verified project facts in docs/project-context.md, durable architecture choices in ADRs, and task evidence with its docs/work/ folder.
- Preserve source IDs, titles, URLs or paths, timestamps, and claim mappings when using retrieved content.
- Do not use stale retrieved data for live operational decisions.

## 6. Verification and evaluation

Use the smallest relevant verification available in the detected stack. For changes to prompts, tools, schemas, routing, agent behavior, or retrieval, update meaningful evaluation cases when the project has an evaluation harness. Do not invent a test command or add a new dependency just to satisfy this guidance.

## 7. Architecture

Keep orchestration, tool execution, business logic, schemas, memory, evaluation, and external integrations separated at useful boundaries. Keep deterministic business rules outside prompts.

## 8. Documentation

When using a library or provider SDK, verify behavior against documentation for the installed version and prefer official sources. Project lockfiles and installed versions take precedence over assumptions based on memory.
