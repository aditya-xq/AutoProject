# Init Skill - AutoProject Bootstrap

You are creating a new autoproject project or onboarding an existing one.

## Greenfield Project (New Project)
1. Ask the user for their project idea and precise requirements
2. Connect the MCP server using `.autoproject/mcp.json` or `cd backend && bun run mcp`
3. Initialize DB with MCP `init`
4. Store source requirements with `requirements_add`
5. Generate incremental steps via `prompts_execute` with `promptKey: "step-generation"` and `context` containing the full requirements + project context
6. Import the generated steps with `steps_import` and the LLM output body
7. Create initial `PROJECT.md` context via `project_context_update`
8. Verify with `project_status` and `project_validate`

## Existing Project Onboarding
1. Analyze the existing codebase, project structure, and conventions
2. Connect the MCP server using `.autoproject/mcp.json` or `cd backend && bun run mcp`
3. Initialize DB with `init`
4. Call `onboard` with `requirements` (what needs to be built) and `projectContext` (codebase analysis)
5. Optionally include `steps` array directly or set `generateSteps: true` and provide steps
6. Or generate steps via `prompts_execute` with `promptKey: "step-generation"` and context=analysis
7. Then import them via `steps_import`
8. Verify with `project_status` and `project_validate`

## Runtime Contract
After init, agents use MCP tools/resources only — no markdown file editing for state and no direct DB writes. Steps, scenarios, designs, test suites, and quality gates live in SQLite behind the MCP server. Use `prompts_execute` for prompt-and-infer in one call, or `prompts_render` plus your own LLM call for custom flows.
