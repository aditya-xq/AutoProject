# AutoProject - Agent Quick-Reference

This project uses AutoProject. The durable workflow state lives in SQLite and is accessed through the AutoProject MCP server. Use MCP tools/resources first; HTTP endpoints are for backend compatibility and non-agent integrations.

## Session Start

1. Connect the AutoProject MCP server from `.autoproject/mcp.json`.
2. Read `.autoproject/runtime-skill.md` for the work loop.
3. Call MCP tool `project_status`, then `project_validate`, then `steps_current`.

## Core MCP Tools

`onboard`, `init`, `project_status`, `project_validate`, `steps_current`, `steps_get`, `step_action`, `prompts_execute`, `scenarios_import`, `scenario_status_update`, `design_import`, `test_suites_create`, `test_suites_run`, `quality_gates_run`, `project_context_update`, `requirements_add`, `worklog`.

## Rules

- Never edit `.autoproject/autoproject.db` directly.
- Do not use backend HTTP directly when MCP is available.
- Generate scenarios and HLD/LLD before implementing.
- Build and register automated tests before production implementation.
- Work only on the step returned by `steps_current`.
- Run quality gates and complete the step only when all gates pass.
