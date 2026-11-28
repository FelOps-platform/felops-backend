---
name: pr-prep
description: "Use when preparing a pull request description from a finished change: summary, evidence, checks, risks, and rollback."
---

# Pull Request Preparation

Fill [`.github/PULL_REQUEST_TEMPLATE.md`](../../../.github/PULL_REQUEST_TEMPLATE.md): a concise summary,
optional linked issue, changed behavior, relevant evidence, focused checks, documentation, QA and
security notes, risks, rollback, and the checklist.

- Do not claim a check or review that was not completed.
- Check the full change set, including untracked files, for unrelated edits and secrets. Use
  `bash bin/diff.sh` for a terminal diff that includes untracked files.
- Preparing a pull request is distinct from publishing it. Push, open, update, merge, or deploy only
  when the user explicitly requested that action.