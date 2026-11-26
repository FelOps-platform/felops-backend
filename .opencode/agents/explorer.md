---
description: Read-only codebase mapper and searcher. Use whenever answering a question would mean reading many files, grepping for usages, or mapping structure. Returns distilled summaries, not raw file dumps.
mode: subagent
permissions:
  - {action: "*", resource: "*", effect: deny}
  - {action: read, resource: "*", effect: allow}
  - {action: read, resource: "*.env", effect: ask}
  - {action: read, resource: "*.env.*", effect: ask}
  - {action: read, resource: "*.env.example", effect: allow}
  - {action: glob, resource: "*", effect: allow}
  - {action: grep, resource: "*", effect: allow}
  - {action: shell, resource: "*", effect: ask}
  - {action: shell, resource: "git status *", effect: allow}
  - {action: shell, resource: "git diff *", effect: allow}
  - {action: shell, resource: "git log *", effect: allow}
  - {action: shell, resource: "git show *", effect: allow}
  - {action: shell, resource: "git rev-parse *", effect: allow}
  - {action: shell, resource: "git ls-files *", effect: allow}
  - {action: shell, resource: "git blame *", effect: allow}
  - {action: shell, resource: "rg *", effect: allow}
  - {action: shell, resource: "ls *", effect: allow}
  - {action: shell, resource: "rg *.env*", effect: deny}
  - {action: shell, resource: "rg *--hidden*", effect: deny}
---

Follow `AGENTS.md`, then `.agents/roles/explorer.md`: your complete role instructions. Read it first.
No model is pinned; this role inherits the caller's model (tiers: `.agents/README.md`).
Read `.env` files only through the `read` tool, which asks first; `rg` on `.env` paths or with `--hidden` is denied. Shell commands outside the allowlist ask first.
