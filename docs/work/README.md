# Work documentation

Keep substantial work together in one folder:

docs/work/<issue-id-or-short-slug>/
  brief.md     brief and acceptance criteria
  plan.md      approach, scope, and verification
  qa.md        optional evidence and follow-up notes

Use an issue identifier when the user supplies one; otherwise choose a short descriptive slug. Do not require a tracker issue when none exists.

## Rules

- Create work docs for feature-sized, multi-file, or risky changes. Skip them for routine, low-risk edits.
- Keep the brief, plan, and evidence together. Do not create per-type folders, generic notes folders, or archives.
- ADRs stay in docs/adr/.
- Use Draft → Planned → In Progress → Done; record a blocking decision as Awaiting input.
- A plan organizes already authorized work. Ask only about material unresolved decisions or actions that need explicit authorization.
- Mark Done after acceptance criteria and relevant verification are complete. Update docs/project-context.md when verified technical state changes.
