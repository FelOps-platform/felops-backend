# ADR-0001: TypeScript 7 tooling compatibility

Status: Accepted
Date: 2026-11-01
Deciders: Backend team
Area: dependencies/tooling

## Context

The project uses TypeScript 7 as its primary compiler for building and
type-checking the application.

TypeScript 7 is a Go-based port of the TypeScript compiler. One important change
is that TypeScript 7.0 does not yet provide the previous programmatic compiler
API. A new API is planned for TypeScript 7.1.

This matters because some ecosystem tools, such as `typescript-eslint`, need to
interact with TypeScript programmatically. They cannot simply run the `tsc`
command; they need access to TypeScript's compiler and type information.

This ADR was migrated from the former TypeScript tooling clarification during
the documentation restructure.

## Decision

Use two TypeScript versions for different purposes:

- **TypeScript 7** — the actual compiler used to build and type-check the
  application.
- **TypeScript 6** — kept for tooling that still depends on the previous
  programmatic TypeScript API.

The second version is **not used to build the application**. It exists only as a
compatibility layer for the tooling ecosystem.

This is intentional and temporary. Removing the older version before the
relevant tools support the new TypeScript 7 API could break linting or other
development tooling.

## Alternatives considered

### Use TypeScript 7 only

- Benefits: one compiler version and a simpler dependency tree.
- Costs: tools that need the programmatic TypeScript API, including
  `typescript-eslint`, would break before TypeScript 7.1 and ecosystem support
  arrive.
- Reason rejected: linting and other development tooling must keep working.

### Stay on TypeScript 6

- Benefits: full compatibility with the current tooling ecosystem.
- Costs: gives up the TypeScript 7 compiler the project uses for building and
  type-checking.
- Reason rejected: TypeScript 7 is the primary compiler; TypeScript 6 is only a
  temporary compatibility dependency.

## Consequences

### Benefits

- Builds and type checks use TypeScript 7.
- Existing tooling continues to work through the TypeScript 6 compatibility
  dependency.

### Trade-offs and risks

- The repository carries two TypeScript versions until the tooling ecosystem
  supports the TypeScript 7 API.
- Installing or updating dependencies must preserve both versions and their
  intended roles.

### Operations

- Migration: none; this records the existing tooling arrangement.
- Rollback: remove the TypeScript 6 compatibility dependency once it is no
  longer needed, or revisit this ADR if the split causes a concrete problem.
- Monitoring: lint and typecheck failures after dependency updates indicate the
  compatibility assumption needs review.
- Documentation: this ADR replaces the former clarification file.

## Follow-ups

- [ ] Remove the TypeScript 6 compatibility dependency once `typescript-eslint`
      and the rest of the required tooling support TypeScript 7's new API.

## References

- [TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
