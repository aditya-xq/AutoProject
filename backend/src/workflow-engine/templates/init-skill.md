# Init Skill - AutoProject Bootstrap

Use this when creating a new AutoProject workspace or onboarding an existing one.

## Greenfield

1. Connect the AutoProject MCP server from `.autoproject/mcp.json`.
2. Call `init`.
3. Call `requirements_add` for source requirements.
4. Call `prompts_execute` with `promptKey: "step-generation"`.
5. Call `steps_import` with the generated steps.
6. Call `project_context_update` with the initial project context.
7. Verify with `project_status` and `project_validate`.

## Existing Project Onboarding

1. Analyze the existing codebase and conventions.
2. Connect MCP and call `onboard` with `requirements` and `projectContext`.
3. If steps were not supplied to `onboard`, call `prompts_execute` with `promptKey: "step-generation"` and import via `steps_import`.
4. Verify with `project_status` and `project_validate`.
