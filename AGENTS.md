# AGENTS.md — Developer Conventions for AI Agents

## JSDoc

Add JSDoc to any function that has **error/edge-case handling**, is a **higher-order function**, has **non-trivial contracts**, or is a **public API** with behavior callers need to understand.

- Use `/** ... */` (not `//` or `/* ... */`)
- Omit `@param` / `@returns` when types are self-explanatory
- Use markdown and `{@link Symbol}` where helpful
- No JSDoc on trivial getters, simple middleware, or one-liners

## Tests

- Test runner: **Bun** (`bun:test`) with `describe`/`test`/`expect`
- Place tests in `__tests__/` colocated with the source file
- **Unit tests** (`*.test.ts`): mock `globalThis.fetch` for HTTP-dependent code; prefer direct function calls over HTTP for non-route logic
- **Integration tests** (`*.integration.test.ts`): use helpers from `src/llm/__tests__/helpers.ts` (`testReq`, `testRawReq`, `testExecuteReq`); setup via `setup.ts`
- Commands: `bun test` (unit), `bun test:integration` (integration)
- Cover public API surface and edge cases (empty/missing input, parse failures, error shapes, concurrent calls)
