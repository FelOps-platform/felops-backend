# Feature brief: [Short name]

Status: Draft / Planned / In Progress / Awaiting input / Done
Created: YYYY-MM-DD
Related issue: [optional link]

## Problem and context

What user need or technical problem does this address? Cite docs/project-context.md or other evidence where useful.

## Goal and non-goals

### Goal

- [Observable outcome]

### Non-goals

- [Out-of-scope behavior]

## Expected behavior

Describe the user-visible or system behavior in plain language.

## Acceptance criteria

- [ ] [Observable result]
- [ ] [Error or edge behavior]

## Backend workflow design (when relevant)

Link the sprint HLD in `docs/` and write a short workflow LLD here or link
its existing backend document. Use the component names from that architecture.

- Main sequence: numbered steps across API Server, AI Service, and external
  systems as relevant. The Backend supplies tools in the incoming turn context
  and executes tool calls.
- API endpoints: method, path, request, success response, and errors.
- Data model: entities, key fields, workspace ownership, and state transitions.
- Failure cases: the important failures, timeouts, and permission errors; link
  each to its sequence step, user-visible result, and cleanup.
- Deferred scope: what this sprint deliberately leaves for later.

## Impacted areas

- User flows:
- APIs or integrations:
- Data and privacy:
- Permissions:

## Risks and constraints

- [Relevant concern]

## Open decisions

Ask only questions whose answers materially change scope, behavior, or risk.

## Evidence needed

- [ ] Focused checks
- [ ] Manual evidence, if needed
