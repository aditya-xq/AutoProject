# Runtime Skill - AutoProject Work Loop

You are working on a project using autoproject. The durable memory is SQLite, accessed through the AutoProject MCP server in `backend/`. The reusable system prompts live in `backend/src/autoproject/prompts.json`.

## Per-Step Loop
1. Call `project_status` and review full state (steps, current step, stats)
2. Call `steps_current` to find the next step
3. Call `step_action` with `action: "start"`
4. Call `prompts_execute` with `promptKey: "test-scenarios"`, `stepId`, and `context` to generate exhaustive test scenarios
5. Call `scenarios_import` with the generated JSON
6. Call `step_action` with `action: "scenarios-generated"`
7. Call `prompts_execute` with `promptKey: "implementation-design"`, `stepId`, and `context` to generate HLD and LLD
8. Call `design_import` with the generated JSON
9. Call `step_action` with `action: "design-generated"`
10. Build the automation suite for every generated scenario, register it with `test_suites_create`, run it with `test_suites_run`, and confirm it fails for the expected reason
11. Call `step_action` with `action: "tests-built"`
12. Retrieve design artifacts with `design_get` and implement the production changes needed by the HLD/LLD until the generated tests pass
13. Call `step_action` with `action: "implemented"`
14. Run quality gates with `quality_gates_run` and correct failures until all gates pass
15. Call `step_action` with `action: "complete"`
16. Update `PROJECT.md` context via `prompts_execute` with `promptKey: "project-context-update"`, `stepId`, and `context` describing what was built, then apply the output with `project_context_update`
17. Repeat

## Validation
- Do NOT implement before scenarios, HLD/LLD, and tests are generated and tracked
- Do NOT skip generated scenarios unless they are marked `deferred` with a clear reason in the worklog
- Do NOT mark complete unless all gates pass
- Do NOT work on steps not returned by `step current`
- Do NOT edit the DB directly; use MCP tools/resources
- Do NOT skip steps without explicit approval

## Plan Gating
The API enforces plan separation: `step current` and `step get` will not return `implementation_plan` until the step reaches `tests_built` status.

## Key API Reference
```text
onboard                  — Onboard existing project
init                     — Initialize DB and agent assets
seed                     — Seed fresh DB with steps (fresh DB only)
steps_import             — Import steps from JSON
steps_create             — Create single step
steps_update             — Update step
steps_delete             — Delete step
steps_list               — List all steps
steps_current            — Current step
steps_get                — Get step details
step_action              — Step lifecycle (start, fail, retry, skip, etc.)
prompts_execute          — Render prompt + call LLM in one step
prompts_render           — Render prompt messages only
prompts_complete         — Manually complete a prompt run
prompts_list             — List available prompt templates
scenarios_import         — Import test scenarios
scenarios_list           — List test scenarios for a step
scenario_status_update   — Update scenario lifecycle status
design_import            — Import HLD/LLD
design_get               — Get approved HLD + LLD artifacts
test_suites_create       — Create test suite
test_suites_run          — Run test suite
test_suites_status       — Check test suite status/history
quality_gates_run        — Run quality gates
quality_gates_status     — Check quality gate run history
project_context_update   — Update PROJECT.md
project_context_get      — Read PROJECT.md
project_status           — Full project status
project_validate         — Validate consistency
requirements_add         — Add requirement
requirements_list        — List requirements
worklog                  — View worklog entries
```
