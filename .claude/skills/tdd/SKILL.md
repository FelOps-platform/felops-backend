---
name: tdd
description: Test-driven development for behavior-focused implementation.
---

# Test-Driven Development

Tests should verify behavior through public interfaces, not implementation details. Prefer focused tests that describe observable behavior and remain useful through refactoring.

Use vertical slices: one behavior test, a minimal implementation, then the next behavior. Avoid writing a speculative suite before understanding the existing interface.

## Workflow

1. Derive behaviors and interface expectations from the user's request, project context, and existing contracts. Ask only if a material choice is unresolved.
2. Choose the smallest useful behavior to verify.
3. Write a failing test when practical, implement the minimal change, and confirm it passes.
4. Repeat for remaining acceptance criteria.
5. Refactor only after the relevant tests pass, then rerun them.

Use the existing test tools and conventions. Do not add dependencies or tests that merely mirror implementation details. Respect existing ADRs and use the explorer subagent for broad mapping when available.

See tests.md for examples, mocking.md for test-double guidance, and refactoring.md for cleanup ideas.
