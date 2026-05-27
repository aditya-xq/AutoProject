# Runtime Skill - AutoProject Work Loop

Use MCP as the integration boundary for AutoProject state and workflow actions. Backend HTTP endpoints are implementation details and compatibility surfaces.

## Per-Step Loop

1. Call `project_status` and `project_validate`.
2. Call `steps_current` and `step_action` with `start`.
3. Call `prompts_execute` for `test-scenarios`, then `scenarios_import`.
4. Call `step_action` with `scenarios-generated`.
5. Call `prompts_execute` for `implementation-design`, then `design_import`.
6. Call `step_action` with `design-generated`.
7. Build tests for every generated scenario, then call `test_suites_create` and `test_suites_run`.
8. Call `step_action` with `tests-built`.
9. Implement using the approved design artifacts until tests pass.
10. Call `step_action` with `implemented`.
11. Call `quality_gates_run` and fix failures.
12. Call `step_action` with `complete`.
13. Update `PROJECT.md` through `project_context_update`.

## Guardrails

- Do not implement before scenarios, design, and tests are tracked.
- Do not skip generated scenarios unless marked `deferred` with a reason.
- Do not work on steps not returned by `steps_current`.
- Do not edit SQLite directly.
