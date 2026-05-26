import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { autoProjectService } from '../workflow-engine/service'
import { llmClient } from '../llm/client'
import type { ChatMessage } from '../llm/types'
import * as schemas from './schemas'
import { mcpOk, mcpFail, wrapTool } from '../shared/mcp-helpers'

export function registerTools(server: McpServer) {
  const svc = autoProjectService

  server.registerTool(
    'init',
    {
      description: 'Initialize the AutoProject database. Creates all required tables and the .autoproject directory. Call this first for greenfield projects.',
      inputSchema: schemas.init,
      annotations: { idempotentHint: true },
    },
    wrapTool(() => svc.init()),
  )

  server.registerTool(
    'seed',
    {
      description: 'Seed the database with an array of step definitions. Only works on a fresh database with no existing steps.',
      inputSchema: schemas.seed,
    },
    wrapTool((params) => svc.seed(params)),
  )

  server.registerTool(
    'project_status',
    {
      description: 'Get the full project status including steps, current step, summary statistics, and metadata. Use this at the start of a session to understand project state.',
      inputSchema: schemas.projectStatus,
      annotations: { readOnlyHint: true },
    },
    wrapTool(() => svc.projectStatus()),
  )

  server.registerTool(
    'project_validate',
    {
      description: 'Run consistency checks on the project: orphan dependencies, duplicate step numbers, stuck steps, missing prompts, and incomplete artifacts. Returns warnings and issues.',
      inputSchema: schemas.projectValidate,
      annotations: { readOnlyHint: true },
    },
    wrapTool(() => svc.validateProject()),
  )

  server.registerTool(
    'project_context_get',
    {
      description: 'Read the current PROJECT.md content that tracks the project summary.',
      inputSchema: schemas.projectContextGet,
      annotations: { readOnlyHint: true },
    },
    wrapTool(() => svc.getProjectContext()),
  )

  server.registerTool(
    'project_context_update',
    {
      description: 'Update the PROJECT.md content with new project context. Called after completing each step.',
      inputSchema: schemas.projectContextUpdate,
    },
    wrapTool((params) => svc.updateProjectContext(params.content)),
  )

  server.registerTool(
    'steps_list',
    {
      description: 'List all steps ordered by sort_order.',
      inputSchema: schemas.stepsList,
      annotations: { readOnlyHint: true },
    },
    wrapTool(() => svc.listSteps()),
  )

  server.registerTool(
    'steps_current',
    {
      description: 'Get the current eligible step. Returns the first active or next pending step whose dependencies are met.',
      inputSchema: schemas.stepsCurrent,
      annotations: { readOnlyHint: true },
    },
    wrapTool(() => svc.currentStep()),
  )

  server.registerTool(
    'steps_get',
    {
      description: 'Get details of a specific step by ID.',
      inputSchema: schemas.stepsGet,
      annotations: { readOnlyHint: true },
    },
    wrapTool((params) => svc.getStep(params.id)),
  )

  server.registerTool(
    'steps_create',
    {
      description: 'Create a single new step. Use for individual step creation after initial seeding.',
      inputSchema: schemas.stepsCreate,
    },
    wrapTool((params) => svc.createStep(params)),
  )

  server.registerTool(
    'steps_import',
    {
      description: 'Import an array of generated step definitions into a fresh database. This is the MCP equivalent of POST /api/steps/import.',
      inputSchema: schemas.stepsImport,
    },
    wrapTool((params) => svc.importSteps(params)),
  )

  server.registerTool(
    'steps_update',
    {
      description: 'Update one or more fields of an existing step.',
      inputSchema: schemas.stepsUpdate,
    },
    wrapTool((params) => {
      const { id, ...input } = params
      return svc.updateStep(id, input)
    }),
  )

  server.registerTool(
    'steps_delete',
    {
      description: 'Delete a step by ID.',
      inputSchema: schemas.stepsDelete,
    },
    wrapTool((params) => svc.deleteStep(params.id)),
  )

  server.registerTool(
    'step_action',
    {
      description: 'Transition a step through its lifecycle. Valid actions depend on the current status: pending → start/skip, in_progress → scenarios-generated/fail, scenarios_generated → design-generated/fail, design_generated → tests-built/fail, tests_built → implemented/fail, implemented → complete/fail, failed → retry/skip.',
      inputSchema: schemas.stepAction,
    },
    wrapTool((params) => svc.stepAction(params.id, params.action)),
  )

  server.registerTool(
    'prompts_list',
    {
      description: 'List all available prompt templates with their keys and purposes.',
      inputSchema: schemas.promptsList,
      annotations: { readOnlyHint: true },
    },
    wrapTool(() => svc.listPrompts()),
  )

  server.registerTool(
    'prompts_render',
    {
      description: 'Render a prompt template for a given step and context. Returns the messages array ready for an LLM call.',
      inputSchema: schemas.promptsRender,
    },
    wrapTool((params) =>
      svc.renderPrompt(params.promptKey, { stepId: params.stepId, context: params.context }),
    ),
  )

  server.registerTool(
    'prompts_execute',
    {
      description: 'Render a prompt template and call the LLM in a single operation. Returns the LLM response. The prompt run is automatically marked completed.',
      inputSchema: schemas.promptsExecute,
    },
    async (params) => {
      try {
        const render = svc.renderPrompt(params.promptKey, {
          stepId: params.stepId,
          context: params.context,
        })
        let result
        try {
          const llmRequest = {
            ...(params.llm || {}),
            messages: render.messages as ChatMessage[],
            ...(params.response_format ? { response_format: params.response_format } : {}),
          } as Record<string, unknown>
          if (params.model !== undefined) llmRequest.model = params.model
          if (params.temperature !== undefined) llmRequest.temperature = params.temperature
          if (params.max_tokens !== undefined) llmRequest.max_tokens = params.max_tokens
          if (params.max_completion_tokens !== undefined)
            llmRequest.max_completion_tokens = params.max_completion_tokens
          result = await llmClient.chat(llmRequest as never)
        } catch (e) {
          try {
            svc.completePrompt(render.runId, {
              status: 'failed',
              outputRef: e instanceof Error ? e.message : String(e),
            })
          } catch {
            // best-effort — the original LLM error is what matters
          }
          throw e
        }
        svc.completePrompt(render.runId, { status: 'completed', outputRef: result.content })
        return mcpOk({
          runId: render.runId,
          promptKey: render.promptKey,
          content: result.content,
          model: result.model,
          usage: result.usage,
        })
      } catch (e) {
        return mcpFail(e)
      }
    },
  )

  server.registerTool(
    'prompts_complete',
    {
      description: 'Manually mark a prompt run as completed or failed with an output reference.',
      inputSchema: schemas.promptsComplete,
    },
    wrapTool((params) =>
      svc.completePrompt(params.runId, { status: params.status, outputRef: params.outputRef }),
    ),
  )

  server.registerTool(
    'scenarios_list',
    {
      description: 'List all test scenarios for a given step.',
      inputSchema: schemas.scenariosList,
      annotations: { readOnlyHint: true },
    },
    wrapTool((params) => svc.listScenarios(params.stepId)),
  )

  server.registerTool(
    'scenarios_import',
    {
      description: 'Import test scenarios for a step. Each scenario requires at least title and expected_result.',
      inputSchema: schemas.scenariosImport,
    },
    wrapTool((params) =>
      svc.importScenarios(params.stepId, {
        promptRunId: params.promptRunId,
        scenarios: params.scenarios,
      }),
    ),
  )

  server.registerTool(
    'scenario_status_update',
    {
      description: 'Update the lifecycle status of a test scenario.',
      inputSchema: schemas.scenarioStatusUpdate,
    },
    wrapTool((params) => svc.updateScenarioStatus(params.id, { status: params.status })),
  )

  server.registerTool(
    'design_get',
    {
      description: 'Get the approved HLD and LLD design artifacts for a step.',
      inputSchema: schemas.designGet,
      annotations: { readOnlyHint: true },
    },
    wrapTool((params) => svc.getDesign(params.stepId)),
  )

  server.registerTool(
    'design_import',
    {
      description: 'Import HLD (high-level design) and LLD (low-level design) artifacts for a step.',
      inputSchema: schemas.designImport,
    },
    wrapTool((params) =>
      svc.importDesign(params.stepId, {
        promptRunId: params.promptRunId,
        hld: params.hld,
        lld: params.lld,
      }),
    ),
  )

  server.registerTool(
    'test_suites_create',
    {
      description: 'Create a test suite for a step with a name and optional file patterns.',
      inputSchema: schemas.testSuitesCreate,
    },
    wrapTool((params) =>
      svc.createTestSuite(params.stepId, { name: params.name, filePatterns: params.filePatterns }),
    ),
  )

  server.registerTool(
    'test_suites_run',
    {
      description: 'Run a test suite by ID. Returns pass/fail status and truncated output.',
      inputSchema: schemas.testSuitesRun,
    },
    wrapTool((params) => svc.runTestSuite(params.id)),
  )

  server.registerTool(
    'test_suites_status',
    {
      description: 'Get the status of one or all test suites.',
      inputSchema: schemas.testSuitesStatus,
      annotations: { readOnlyHint: true },
    },
    wrapTool((params) => svc.testSuiteStatus(params.id)),
  )

  server.registerTool(
    'quality_gates_run',
    {
      description: 'Run all quality gates (lint, typecheck, test, build) for a step. The gates run in a local shell.',
      inputSchema: schemas.qualityGatesRun,
    },
    wrapTool((params) => svc.runQualityGates(params.stepId)),
  )

  server.registerTool(
    'quality_gates_status',
    {
      description: 'Get quality gate run history for a step or the latest across all steps.',
      inputSchema: schemas.qualityGatesStatus,
      annotations: { readOnlyHint: true },
    },
    wrapTool((params) => svc.qualityGateStatus(params.stepId)),
  )

  server.registerTool(
    'requirements_add',
    {
      description: 'Add a new requirement to the project.',
      inputSchema: schemas.requirementsAdd,
    },
    wrapTool((params) => svc.addRequirement({ body: params.body, source: params.source })),
  )

  server.registerTool(
    'requirements_list',
    {
      description: 'List all requirements ordered by creation date descending.',
      inputSchema: schemas.requirementsList,
      annotations: { readOnlyHint: true },
    },
    wrapTool(() => svc.listRequirements()),
  )

  server.registerTool(
    'worklog',
    {
      description: 'View worklog entries for a specific step or all recent entries.',
      inputSchema: schemas.worklog,
      annotations: { readOnlyHint: true },
    },
    wrapTool((params) => svc.worklog(params.stepId)),
  )

  server.registerTool(
    'onboard',
    {
      description: 'Onboard an existing project by recording requirements and PROJECT.md context, optionally importing generated steps for a fresh project.',
      inputSchema: schemas.onboard,
    },
    wrapTool((params) => svc.onboard(params)),
  )
}
