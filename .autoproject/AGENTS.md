# AutoProject - Agent Quick-Reference

This project uses autoproject: build one incremental step at a time, with generated test scenarios, generated HLD/LLD, automation first, and implementation second. Use the AutoProject MCP server as the primary integration point.

## Session Start
1. The AutoProject MCP server is auto-launched by opencode (configured in `opencode.json`). Verify it's connected before proceeding.
2. Read this file and `.autoproject/runtime-skill.md` for the full work loop and rules.
3. Call MCP `project_status`, `project_validate`, and `steps_current`

## Key Commands
```text
# Lifecycle MCP tools
project_status                 — Full project state (steps, current, stats)
project_validate               — Consistency checks
steps_current                  — Current eligible step
steps_get                      — Step details (plan gated until tests_built)
design_get                     — Approved HLD + LLD artifacts
init                           — Initialize DB and agent assets
scenarios_list                 — Test scenarios for a step
onboard                        — Onboard existing project
steps_import                   — Bulk import steps (fresh DB only)
scenario_status_update         — Update scenario lifecycle status
step_action                    — Step transition (see Actions below)
scenarios_import
design_import
test_suites_create
test_suites_run
quality_gates_run
project_context_update         — Update PROJECT.md
project_context_get            — Read PROJECT.md
requirements_add               — Add requirement
requirements_list              — List requirements
worklog                        — Worklog entries

# LLM MCP tools
prompts_execute                — Render prompt + call LLM
prompts_render                 — Render prompt messages only

# Step Actions
# start | scenarios-generated | design-generated | tests-built | implemented | complete | fail | skip | retry
```

## Step Actions
| Current Status      | Valid Actions                                                   |
|---------------------|-----------------------------------------------------------------|
| pending             | `start`, `skip`                                                 |
| in_progress         | `scenarios-generated`, `fail`                                   |
| scenarios_generated | `design-generated`, `fail`                                      |
| design_generated    | `tests-built`, `fail`                                           |
| tests_built         | `implemented`, `fail`                                           |
| implemented         | `complete`, `fail`                                              |
| failed              | `retry`, `skip`                                                 |
| completed / skipped | *(none)*                                                        |

## Rules
- During initial project setup only: generate step definitions via `prompts_execute` with `promptKey: "step-generation"`, then import via `steps_import`
- For individual step creation after init, use `steps_create`
- Generate test scenarios from the prompts API before writing tests
- Generate HLD and LLD before implementation design is used
- Build the automation suite for all generated scenarios before production implementation
- Implement only after tests are built and failing
- Only work on steps from `step current`
- `implementation_plan` is gated — only visible at `tests_built`, `implemented`, `completed` (API enforces this)
- Never edit `.autoproject/autoproject.db` directly and do not use direct HTTP when MCP is available
- Update `PROJECT.md` after each completed step via `project_context_update`
- Use `fail` action to mark a step failed, `retry` to resume, `skip` to bypass
