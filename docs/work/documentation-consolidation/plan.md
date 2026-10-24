# Plan: documentation consolidation

Status: Done
Created: 2026-10-24
Brief: [brief.md](brief.md)

## Scope and authorization

The current request authorizes consolidating, checking, publishing, and merging
the existing documentation PR. Preserve its authorship and incorporate the
current `main`, including the required branch synchronization rule.

## Steps

1. Reconcile the product documents in `api/docs/`, keeping architecture and
   database design canonical and all undecided contracts explicit.
2. Remove commands and the dedicated dependency for retired local API-doc
   generation, and explain the Apidog handoff in the API contributor README.
3. Connect the root README, AGENTS, onboarding, project context, and verified
   metadata to the canonical product docs. Work records describe changes and
   reference the current designs rather than copying them.
4. Run the two credential-free workflow checks, validate changed-document
   links and package consistency, and run applicable API static checks.
5. Have an independent reviewer assess the entire PR, fix findings, publish
   the reconciled branch, inspect its checks, and merge the exact reviewed head.
6. Fast-forward local `main` to the verified remote merge result.

## Verification and boundaries

Use the existing scripts in `bin/` and the API package's lint, typecheck, and
build commands. Do not supply secrets or contact Infisical/Supabase for a
documentation change. Record the existing authenticated-test limitation and
any external deployment-check result accurately in [qa.md](qa.md).

Retired documentation remains recoverable from Git history. Keep the database
revision, Apidog invitation, endpoint definitions, and mocks as subsequent work;
do not invent a workspace URL or mark them complete.

## Completion evidence

Local consolidation, focused verification, and independent reviews are complete;
see [qa.md](qa.md). The existing PR tracks remote checks and merge delivery.
No backend endpoint, schema migration, or application deployment is included.
