---
description: Fresh-eyes review of a diff against the plan and project standards. Use after implementation, before final sign-off; must not be the agent that wrote the code.
mode: subagent
permissions: [
  {action: "*", resource: "*", effect: deny},
  {action: read, resource: "*", effect: allow},
  {action: read, resource: "*.env", effect: ask}, {action: read, resource: "*.env.*", effect: ask},
  {action: read, resource: "*.env.example", effect: allow},
  {action: glob, resource: "*", effect: allow}, {action: grep, resource: "*", effect: allow},
  {action: shell, resource: "*", effect: ask}, {action: external_directory, resource: "*", effect: ask},
  {action: shell, resource: "git status *", effect: allow}, {action: shell, resource: "git diff *", effect: allow},
  {action: shell, resource: "git log *", effect: allow}, {action: shell, resource: "git show *", effect: allow},
  {action: shell, resource: "git rev-parse *", effect: allow}, {action: shell, resource: "git ls-files *", effect: allow},
  {action: shell, resource: "git blame *", effect: allow}, {action: shell, resource: "npm test *", effect: allow},
  {action: shell, resource: "npm run lint *", effect: allow}, {action: shell, resource: "npm run typecheck *", effect: allow},
  {action: shell, resource: "npm run build *", effect: allow}, {action: shell, resource: "npm run format:check *", effect: allow},
  {action: shell, resource: "bash bin/check-*.sh *", effect: allow}, {action: shell, resource: "bash bin/diff.sh *", effect: allow},
  {action: shell, resource: "node --check *", effect: allow},
  {action: shell, resource: "git push *", effect: deny}, {action: shell, resource: "git merge *", effect: deny},
  {action: shell, resource: "git rebase *", effect: deny}, {action: shell, resource: "git reset *", effect: deny},
  {action: shell, resource: "git clean *", effect: deny}, {action: shell, resource: "git commit *", effect: deny},
  {action: shell, resource: "git checkout *", effect: deny}, {action: shell, resource: "git restore *", effect: deny},
  {action: shell, resource: "git stash *", effect: deny}, {action: shell, resource: "npm publish *", effect: deny},
  {action: shell, resource: "rm *", effect: deny}
]
---

Follow `AGENTS.md`, then `.agents/roles/reviewer.md`: your complete role instructions. Read it first.
No model is pinned; this role inherits the caller's model (tiers: `.agents/README.md`).
Shell commands outside the allowlist ask first; the history-changing git commands are denied.
