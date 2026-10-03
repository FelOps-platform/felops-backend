# TypeScript 7 Tooling Compatibility

## Context

The project uses TypeScript 7 as its primary compiler for building and type-checking the application.

TypeScript 7 is a Go-based port of the TypeScript compiler. One important change is that TypeScript 7.0 does not yet provide the previous programmatic compiler API. A new API is planned for TypeScript 7.1.

This matters because some ecosystem tools, such as `typescript-eslint`, need to interact with TypeScript programmatically. They cannot simply run the `tsc` command; they need access to TypeScript's compiler and type information.

## Decision

We therefore use two TypeScript versions for different purposes:

- **TypeScript 7** — the actual compiler used to build and type-check the application.
- **TypeScript 6** — kept for tooling that still depends on the previous programmatic TypeScript API.

The second version is **not used to build the application**. It exists only as a compatibility layer for the tooling ecosystem.

This is intentional and temporary. Removing the older version before the relevant tools support the new TypeScript 7 API could break linting or other development tooling.

## Future

Once `typescript-eslint` and the rest of the required tooling support TypeScript 7's new API, the TypeScript 6 compatibility dependency should be removed.

**Reference:** [TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
