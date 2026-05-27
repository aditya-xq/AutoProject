# AUTOPROJECT PATTERNS

> Requirements become incremental steps stored in SQLite. Agents interact through the AutoProject MCP server; backend HTTP endpoints exist as a compatibility layer.

---

## Architecture

```
User Requirements ──> MCP prompts_execute (step-generation) ──> MCP steps_import ──> SQLite DB
                                                                                            │
                                         ┌────────────────────────────────────────────────┘
                                         ▼
                              For each step (iterate):
                               MCP prompts_execute (test-scenarios)
                                    →  import scenarios
                                    →  status: scenarios-generated
                               MCP prompts_execute (implementation-design)
                                    →  import HLD/LLD
                                    →  status: design-generated
                              Build automation suite → tests-built
                              Implement using HLD/LLD → implemented
                              Run quality gates → complete
                                    →  update PROJECT.md via MCP project_context_update
```

### Init (Greenfield)
```
Requirements → MCP prompts_execute (step-generation) → MCP steps_import → MCP project_context_update
```

### Init (Existing Project / Onboarding)
```
MCP onboard { requirements, projectContext } → optional MCP prompts_execute + steps_import
```

### Runtime
```
MCP project_status → MCP steps_current → start → generate scenarios → generate design → build tests → implement → gates → complete → update PROJECT.md
```

---

## Agent MCP Interface

Agents interact with project state through MCP tools/resources. The backend owns SQLite state; MCP is the de facto integration boundary for AI agents.

```text
onboard                  — Onboard an existing project and write MCP-first agent assets
init                     — Initialize DB and .autoproject agent/MCP assets
project_status           — Project status
project_validate         — Validate consistency
steps_current            — Current step
steps_get                — Get step
steps_import             — Import generated steps
step_action              — Step lifecycle
prompts_execute          — Render prompt + call OpenAI-compatible LLM
scenarios_import         — Import scenarios
scenario_status_update   — Mark scenario automation status
design_import            — Import HLD/LLD
test_suites_create       — Create test suite
test_suites_run          — Run test suite
quality_gates_run        — Run quality gates
project_context_get      — Read PROJECT.md
project_context_update   — Update PROJECT.md
requirements_add         — Add requirement
worklog                  — Inspect recent actions
```

Run MCP with `cd backend && bun run mcp`, or use the generated `.autoproject/mcp.json`. HTTP endpoints mirror these operations for compatibility with non-MCP clients.

---

## State Machine

```
pending -> in_progress -> scenarios_generated -> design_generated -> tests_built -> implemented -> completed
                                                                               -> failed -> in_progress (retry)
any -> skipped (manual override)
```

**Dependency rule**: A step can't start until its `depends_on_step_id` is `completed`.

---

## Key Design Decisions

- **DB is the source of truth**: Steps, scenarios, designs, test suites, quality gates — all in SQLite
- **Steps live in the DB**: Created via `POST /api/steps/import` or `POST /api/steps` — no markdown files
- **`PROJECT.md` is a dynamic summary**: Updated after each completed step via `POST /api/project/context` — captures concise project state for agent context
- **Prompt gating**: The API enforces that scenarios, designs, and tests are completed before production code
- **Validation layers**: Agent skills → prompt schemas → API enforcement → DB CHECK constraints
- **MCP is the agent interface**: AI agents use MCP tools/resources first; direct HTTP is reserved for compatibility and non-agent automation

---

## Core Files

| File | Purpose |
|------|---------|
| `AUTOPROJECT.md` | This file — methodology |
| `PROJECT.md` | Dynamic project context — updated after each step |
| `backend/` | Hono API backend for all workflow actions |
| `.autoproject/runtime-skill.md` | Agent work loop instructions |
| `.autoproject/init-skill.md` | Agent bootstrap instructions |
| `.autoproject/AGENTS.md` | Agent quick-reference |

---

## Conventions

- **MCP first**: Never edit the DB directly; use MCP tools for agent workflows
- **Prompted generation first**: Generate scenarios and HLD/LLD before writing tests or implementation
- **Automation first**: Convert every generated scenario into a tracked automated suite before implementation
- **Fail red**: New tests must fail initially
- **Pass green**: Implementation makes tests pass
- **No regression**: Previous tests still pass
- **One step at a time**: Never skip ahead
- **Quality gates**: Run after every step; failure means incomplete

---

## Error Recovery

1. `POST /api/steps/:id/actions/fail` — record the failure
2. Diagnose from test output or gate results
3. `POST /api/steps/:id/actions/retry` — return to `in_progress`
4. If unresolvable after 3 attempts: `POST /api/steps/:id/actions/skip` and create a follow-up step

---

## Quality Gates

Run after every step via `POST /api/steps/:id/quality-gates/run`. Default gates:
```bash
bun test          # All tests pass
bun run check     # 0 type errors
bun run lint      # 0 lint errors, when available
bun run build     # exit 0
```
