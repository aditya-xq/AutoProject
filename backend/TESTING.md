# Testing

Tests use [Bun's test runner](https://bun.sh/docs/cli/test). Run all tests from `backend/`.

```bash
cd backend
bun test                        # all tests (unit + integration, 600s timeout)
bun run test:unit               # unit tests only (no external deps, 120s timeout)
bun run test:integration        # service-level workflow integration tests
bun run test:live:workflow      # live HTTP workflow E2E tests; needs running backend
bun run test:live:llm           # live LLM tests; needs running backend + provider
```

## Test Layout

```
src/
├── __tests__/
│   └── app.test.ts                       # HTTP endpoint unit tests
├── mcp/__tests__/                        # MCP tool/resource unit tests
│   ├── tools.test.ts                     # MCP tool unit tests (InMemory transport)
│   ├── resources.test.ts                 # MCP resource unit tests
│   ├── error-handling.test.ts            # MCP error-handling unit tests
│   └── mcp.integration.test.ts           # MCP stdio transport integration
├── llm/__tests__/                        # LLM client + integration tests
│   ├── client.test.ts                    # chat completion, passthrough, errors
│   ├── health.integration.test.ts        # backend health + routing
│   ├── chat.integration.test.ts          # live chat (needs LLM_API_KEY)
│   ├── execute.integration.test.ts       # live prompt execute (needs LLM_API_KEY)
│   └── zzz-cleanup.integration.test.ts
├── shared/__tests__/                     # Shared utility tests
│   ├── response.test.ts                  # ok() / readBody()
│   └── mcp-helpers.test.ts               # mcpOk / mcpFail / wrapTool
├── workflow-engine/__tests__/            # workflow-engine unit + integration tests
│   ├── database.test.ts                  # DB schema + helpers
│   ├── errors.test.ts                    # ApiError class
│   ├── gates.test.ts                     # quality gates + test suite runner
│   ├── onboarding.test.ts                # init + onboard flow
│   ├── paths.test.ts                     # path exports
│   ├── prompts.test.ts                   # prompt loading + rendering
│   ├── service.test.ts                   # AutoProjectService (seed, CRUD, actions, etc.)
│   ├── workflow.test.ts                  # transition validation, step ordering
│   ├── workflow.integration.test.ts      # full lifecycle via service
│   ├── workflow.live.integration.test.ts # live HTTP API E2E workflow
│   └── zzz-cleanup.integration.test.ts
├── workflow-engine/repos/__tests__/      # Repository-layer unit tests
│   ├── step-repo.test.ts
│   ├── scenario-repo.test.ts
│   ├── design-repo.test.ts
│   ├── suite-repo.test.ts
│   ├── requirement-repo.test.ts
│   ├── project-context-repo.test.ts
│   └── worklog-repo.test.ts
```

## Running Specific Tests

### By File

```bash
bun test src/app.test.ts
bun test src/mcp/__tests__/tools.test.ts
bun test src/workflow-engine/__tests__/service.test.ts
```

### By Folder / Pattern

```bash
bun run test:unit                     # all unit tests
bun run test:integration             # workflow service integration only
bun run test:live:workflow           # workflow live HTTP E2E only
bun run test:live:llm                # LLM live E2E only
```

## Unit vs Integration

| Type                | Command                      | Timeout | Notes                                                      |
| ------------------- | ---------------------------- | ------- | ---------------------------------------------------------- |
| All                 | `bun test`                   | 600s    | Runs everything; live tests skip gracefully when unavailable |
| Unit                | `bun run test:unit`          | 120s    | No external dependencies                                   |
| Service integration | `bun run test:integration`   | 300s    | Direct workflow service lifecycle, isolated temp DB        |
| Workflow live E2E   | `bun run test:live:workflow` | 600s    | Requires running backend                                   |
| LLM live E2E        | `bun run test:live:llm`      | 600s    | Requires running backend + configured LLM provider         |

`zzz-cleanup.integration.test.ts` files run last (alphabetical sort) and generate HTML reports.

## Live Tests — Safety and Behavior

Live tests **gracefully skip** when their preconditions are not met — they never call `process.exit()` or crash the test runner.

### Workflow Live E2E

These tests call the real HTTP API and must run against a disposable backend root:

```powershell
cd backend
$env:AUTOPROJECT_ROOT = Join-Path $env:TEMP "workflow-live-e2e"
bun run dev
```

In a second terminal:

```powershell
cd backend
bun test                           # includes live E2E tests
```

The live workflow suite covers init, step import, ordering, scenario/design/test-suite gates, prompt rendering, project context, worklog, error envelopes, and optional quality-gated completion.

**Safety guard**: [`AUTOPROJECT_ROOT`] must include `workflow-live-e2e`; otherwise the suite is **completely skipped** (no tests run, no cleanup touches production data).

**Quality-gated completion**: The test detects whether [`AUTOPROJECT_ROOT`] has a `package.json`. If present, it runs local `lint`, `check`, `test`, and `build` scripts from that directory. If absent, the quality-gates section is skipped with a clear message.

**Cleanup**: After all tests, the suite:
1. Deletes known live E2E DB rows (`step-9001`, `step-9002`, related artifacts, prompt runs, and worklog entries)
2. Removes dummy live-test files (`PROJECT.md`, agent skill files)
3. If the backend still holds the SQLite lock, directory deletion is deferred

### LLM Integration Tests

These hit the real HTTP backend and can call an LLM provider:

- **[`health.integration.test.ts`]** — Always runs; only calls `GET /health` (no API key needed)
- **[`chat.integration.test.ts`]** — Full chat round-trip; requires `LLM_API_KEY` (or `OPENAI_API_KEY` for OpenAI base URL). Tests fail gracefully if the backend or provider is unreachable.
- **[`execute.integration.test.ts`]** — Prompt execute flow; same dependencies.

```bash
$env:LLM_API_KEY = "sk-..."    # powershell
export LLM_API_KEY=sk-...      # bash
bun test                        # includes LLM integration tests
```

Cleanup removes only prompt runs whose input contexts match the live LLM test prompts, plus matching worklog rows. It only operates when [`AUTOPROJECT_ROOT`] is set and the DB file exists — never falls back to production paths.

## HTML Reports

Integration test suites generate a browsable HTML report in the temp directory:

```
C:\Users\<user>\AppData\Local\Temp\workflow-engine-test-report-*.html
C:\Users\<user>\AppData\Local\Temp\llm-test-report-*.html
```

The report path is printed at the end of each integration run.

## Test Conventions

- Each unit test file creates isolated state (in-memory DB or temp directory).
- `freshService(name)` in `service.test.ts` creates a uniquely-named temp directory per call.
- Test files do **not** share module-level mutable state between files.
- The `afterEach` hook in `service.test.ts` closes all open DB connections.
- Integration tests clean up temp directories in their `zzz-cleanup` file.
- Live tests gracefully skip (not crash) when their prerequisites are unavailable — making `bun test` safe to run in any environment.
