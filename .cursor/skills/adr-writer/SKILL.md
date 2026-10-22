---
name: adr-writer
description: Write ADRs only for significant architecture, dependency, data, security, deployment, or contract decisions.
---

# ADR Writer

An ADR is required when a decision is hard to reverse or affects architecture, data, security,
deployment, integrations, or cross-team contracts. Skip it for routine, easily-reversed choices.

Naming: `docs/adr/ADR-0001-short-title.md` (increment the number).

Use `docs/templates/ADR-template.md`. Include context, the decision, why now, alternatives
considered, consequences (positive and tradeoffs), operational impact (migration, rollback,
monitoring), follow-ups, and references to the feature brief / plan / issue.
