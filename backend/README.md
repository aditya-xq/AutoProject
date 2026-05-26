# AutoProject Backend

Bun/Hono backend and MCP server for the AutoProject workflow. AI agents should use the MCP server as the primary integration point; HTTP endpoints mirror the same operations for compatibility and non-agent automation.

## Run

```bash
cd backend
bun install
bun run dev
```

Defaults to `http://localhost:3001`. Set `AUTOPROJECT_ROOT` if the backend should manage a different workspace root.

Run the MCP server for agents:

```bash
cd backend
bun run mcp
```

`POST /api/init` and MCP `init` create `.autoproject/mcp.json`, `.autoproject/AGENTS.md`, and the runtime/init skill files when they are missing.

## Core Flow

```text
requirements_add
prompts_execute (step-generation)
steps_import
steps_current
step_action start
prompts_execute (test-scenarios)
scenarios_import
step_action scenarios-generated
prompts_execute (implementation-design)
design_import
step_action design-generated
test_suites_create
test_suites_run
step_action tests-built
step_action implemented
quality_gates_run
step_action complete
project_context_update
```

## MCP Tool Summary

Project and onboarding:

- `init`
- `seed`
- `onboard`
- `project_status`
- `project_validate`
- `project_context_get`
- `project_context_update`
- `requirements_add`
- `requirements_list`

Steps and artifacts:

- `steps_current`
- `steps_get`
- `steps_list`
- `steps_create`
- `steps_import`
- `steps_update`
- `steps_delete`
- `step_action`
- `prompts_list`
- `prompts_render`
- `prompts_execute`
- `prompts_complete`
- `scenarios_list`
- `scenarios_import`
- `scenario_status_update`
- `design_get`
- `design_import`
- `test_suites_create`
- `test_suites_run`
- `test_suites_status`
- `quality_gates_run`
- `quality_gates_status`
- `worklog`

Resources expose state through 10 resource URIs: `autoproject://project/status`, `autoproject://project/context`, `autoproject://steps`, `autoproject://requirements`, `autoproject://prompts`, `autoproject://worklog`, plus step-specific templates (`/steps/{stepId}`, `/steps/{stepId}/scenarios`, `/steps/{stepId}/design`, `/steps/{stepId}/quality-gates`).

All responses use:

```json
{ "success": true, "data": {}, "requestId": "..." }
```

Errors use:

```json
{ "success": false, "error": { "code": "...", "message": "..." }, "requestId": "..." }
```

## HTTP Endpoint Summary

Use these when MCP is unavailable or for non-agent integrations.

Project:

- `POST /api/init`
- `POST /api/seed`
- `GET /api/project/status`
- `GET /api/project/validate`
- `GET /api/project/context`
- `POST /api/project/context` with `{ "content": "..." }`
- `POST /api/onboard` with `{ "requirements": "...", "projectContext": "...", "generateSteps?": true, "steps?": [] }`

Requirements:

- `GET /api/requirements`
- `POST /api/requirements` with `{ "body": "...", "source": "user" }`

Steps:

- `GET /api/steps`
- `GET /api/steps/current`
- `GET /api/steps/:stepId`
- `POST /api/steps` with `{ "step_number": "...", "title": "...", "objective": "...", ... }`
- `POST /api/steps/import` with `[{ "step_number": "...", "title": "...", ... }]`
- `PATCH /api/steps/:stepId` with partial step fields
- `DELETE /api/steps/:stepId`
- `POST /api/steps/:stepId/actions/:action`

Prompts:

- `GET /api/prompts`
- `POST /api/prompts/:promptKey/render` with `{ "stepId": "step-0-1", "context": "..." }`
- `POST /api/prompt-runs/:runId/complete` with `{ "status": "completed", "outputRef": "..." }`

Scenarios and design:

- `GET /api/steps/:stepId/scenarios`
- `POST /api/steps/:stepId/scenarios/import` with `{ "promptRunId": "...", "scenarios": [] }`
- `PATCH /api/scenarios/:scenarioId/status` with `{ "status": "automated" }`
- `GET /api/steps/:stepId/design`
- `POST /api/steps/:stepId/design/import` with `{ "promptRunId": "...", "hld": {}, "lld": {} }`

Tests, gates, history:

- `GET /api/test-suites`
- `GET /api/test-suites/:suiteId`
- `POST /api/steps/:stepId/test-suites` with `{ "name": "...", "filePatterns": ["..."] }`
- `POST /api/test-suites/:suiteId/run`
- `GET /api/quality-gates`
- `GET /api/steps/:stepId/quality-gates`
- `POST /api/steps/:stepId/quality-gates/run`
- `GET /api/worklog`
- `GET /api/steps/:stepId/worklog`

LLM inference:

- `POST /api/llm/chat` with `{ "messages": [...], "model?": "...", "temperature?": 0.7 }`
- `POST /api/llm/execute` with `{ "promptKey": "...", "stepId": "...", "context?": "...", "model?": "..." }`

The LLM client forwards OpenAI-compatible chat completion fields such as `tools`, `tool_choice`, `response_format`, `max_completion_tokens`, `reasoning_effort`, penalties, `stop`, and `seed`. Streaming is intentionally not handled by the helper; use a direct provider stream if streaming is required.

## Environment Variables

| Variable            | Default                       | Purpose                                        |
| ------------------- | ----------------------------- | ---------------------------------------------- |
| `BACKEND_PORT`      | `3001`                        | HTTP listen port                               |
| `BACKEND_HOST`      | `127.0.0.1`                   | HTTP listen hostname                           |
| `AUTOPROJECT_ROOT`  | project root                  | Override workspace root                        |
| `LLM_BASE_URL`      | `http://127.0.0.1:1234/v1`   | OpenAI-compatible API base URL                 |
| `LLM_API_KEY`       | —                             | API key for LLM provider                       |
| `LLM_MODEL`         | `qwen/qwen3-1.7b`             | Default model for LLM calls                    |
| `OPENAI_API_KEY`    | —                             | Fallback if `LLM_BASE_URL` points to OpenAI    |
| `ANTHROPIC_API_KEY` | —                             | Fallback if `LLM_BASE_URL` points to Anthropic |

The LLM client auto-detects the provider from `LLM_BASE_URL` and falls back to the appropriate `*_API_KEY` variable. Set `LLM_BASE_URL` to any OpenAI-compatible endpoint (OpenAI, Anthropic, Ollama, vLLM, etc.).
