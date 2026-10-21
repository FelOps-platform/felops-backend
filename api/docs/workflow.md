# Workflow

We work in sprints. Each sprint has one clear goal, supported by one or more workflows.

## The pattern

For each sprint, we first identify the workflows needed to reach the goal, then follow this order:

**Design → Implementation → Deployment**

---

## The Design Phase

Start with the High-Level Design (HLD) for the sprint — the main data flow and the core components involved. Then go into the Low-Level Design (LLD) for each workflow: the sequence, the API endpoints, the data model, and the failure cases.

### What to write for each workflow

Write it down. Use numbered steps and keep it short.

1. **Main flow** — numbered steps. If a step has branches, put them under that step.
2. **Failure cases** — F1, F2, ... Each one points to a step number and says: what failed, what does the user see, and what cleanup is needed.
3. **API endpoints** — method, path, request body, success response, errors.
4. **Data model** — tables and their key fields, plus states if the entity has any.
5. **Not handled yet** — what we are intentionally skipping in this sprint.

---

## Writing Rules

- Use the same component names as the architecture doc: API Server, AI Service, MCP Server, etc.
- Cover the main path and the 2–3 failures that can actually hurt users or corrupt data. Don't try to cover every edge case.
- For each step, ask: what if it fails? What if it times out? What if the user isn't allowed?
