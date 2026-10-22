---
name: pr-prep
description: Prepare a pull request summary with evidence, risks, and rollback.
---

# Pull Request Preparation

Use .github/PULL_REQUEST_TEMPLATE.md.

Include a concise summary, optional linked issue, changed behavior, relevant evidence, focused checks, documentation, QA and security notes, risks, rollback, and the checklist. Do not claim a check or review that was not completed. Check the full change set, including untracked files, for unrelated edits and secrets.

Use bin/diff.sh when a terminal diff must include both tracked and untracked files. Preparing a pull request is distinct from publishing it. Push, open, update, merge, or deploy only when the user explicitly requested that action.
