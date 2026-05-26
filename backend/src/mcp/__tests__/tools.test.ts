import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  getToolNames,
  parseJsonContent,
  getFirstStepId,
  getLastStepId,
  getScenarioId,
  getSuiteId,
} from './helpers'

const TEST_ROOT = join(tmpdir(), `autoproject-mcp-tools-${Date.now()}`)
rmSync(TEST_ROOT, { recursive: true, force: true })
mkdirSync(TEST_ROOT, { recursive: true })
writeFileSync(join(TEST_ROOT, 'PROJECT.md'), '# MCP Test Project\n', 'utf-8')
process.env.AUTOPROJECT_ROOT = TEST_ROOT

const { registerTools } = await import('../tools')
const { registerResources } = await import('../resources')
const { autoProjectService } = await import('../../workflow-engine/service')

let client: Client

beforeAll(async () => {
  autoProjectService.init()
  autoProjectService.seed({
    steps: [
      {
        step_number: '1',
        title: 'Setup',
        objective: 'Initialize',
        validation: 'lint',
        depends_on: null,
      },
      {
        step_number: '2',
        title: 'Build',
        objective: 'Build core',
        validation: 'typecheck',
        depends_on: '1',
      },
    ],
  })

  const server = new McpServer(
    { name: 'test-mcp', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {} } },
  )
  registerTools(server)
  registerResources(server)

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  client = new Client({ name: 'test-client', version: '0.1.0' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
})

afterAll(() => {
  autoProjectService.closeDB()
  try {
    rmSync(TEST_ROOT, { recursive: true, force: true })
  } catch {
    // Windows may hold SQLite WAL locks briefly after closeDB
  }
})

// ───── Tool Listing ─────

describe('MCP Tools - Registration', () => {
  test('listTools returns all 32 registered tools', async () => {
    const result = await client.listTools()
    expect(result.tools).toBeDefined()
    const names = getToolNames(result.tools)
    expect(names.length).toBe(32)
    expect(names).toContain('init')
    expect(names).toContain('seed')
    expect(names).toContain('project_status')
    expect(names).toContain('project_validate')
    expect(names).toContain('project_context_get')
    expect(names).toContain('project_context_update')
    expect(names).toContain('steps_list')
    expect(names).toContain('steps_current')
    expect(names).toContain('steps_get')
    expect(names).toContain('steps_create')
    expect(names).toContain('steps_import')
    expect(names).toContain('steps_update')
    expect(names).toContain('steps_delete')
    expect(names).toContain('step_action')
    expect(names).toContain('prompts_list')
    expect(names).toContain('prompts_render')
    expect(names).toContain('prompts_execute')
    expect(names).toContain('prompts_complete')
    expect(names).toContain('scenarios_list')
    expect(names).toContain('scenarios_import')
    expect(names).toContain('scenario_status_update')
    expect(names).toContain('design_get')
    expect(names).toContain('design_import')
    expect(names).toContain('test_suites_create')
    expect(names).toContain('test_suites_run')
    expect(names).toContain('test_suites_status')
    expect(names).toContain('quality_gates_run')
    expect(names).toContain('quality_gates_status')
    expect(names).toContain('requirements_add')
    expect(names).toContain('requirements_list')
    expect(names).toContain('worklog')
    expect(names).toContain('onboard')
  })

  test('Each tool has a name, description, and inputSchema', async () => {
    const result = await client.listTools()
    for (const tool of result.tools as { name: string; description?: string; inputSchema?: { type: string } }[]) {
      expect(typeof tool.name).toBe('string')
      expect(typeof tool.description).toBe('string')
      expect(tool.description!.length).toBeGreaterThan(0)
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema!.type).toBe('object')
    }
  })
})

// ───── Tool Execution: Project Status ─────

describe('MCP Tools - Project Status & Info', () => {
  test('project_status returns full project state', async () => {
    const result = await client.callTool({ name: 'project_status', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as {
      steps: unknown[]
      meta: unknown
      stats: { total: number }
    }
    expect(data.steps).toBeDefined()
    expect(data.steps.length).toBeGreaterThanOrEqual(2)
    expect(data.meta).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.stats.total).toBeGreaterThanOrEqual(2)
  })

  test('project_validate returns validation results', async () => {
    const result = await client.callTool({ name: 'project_validate', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { valid: boolean; issues: unknown[]; warnings: unknown[] }
    expect(typeof data.valid).toBe('boolean')
    expect(Array.isArray(data.issues)).toBe(true)
    expect(Array.isArray(data.warnings)).toBe(true)
  })

  test('project_context_get returns context', async () => {
    const result = await client.callTool({ name: 'project_context_get', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { exists: boolean; content: string }
    expect(typeof data.exists).toBe('boolean')
    expect(typeof data.content).toBe('string')
  })

  test('project_context_update writes and persists context', async () => {
    const result = await client.callTool({
      name: 'project_context_update',
      arguments: { content: '# MCP Test Project\n\nTesting MCP layer.' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { updated: boolean }
    expect(data.updated).toBe(true)

    const read = await client.callTool({ name: 'project_context_get', arguments: {} })
    const readData = parseJsonContent(read) as { content: string }
    expect(readData.content).toBe('# MCP Test Project\n\nTesting MCP layer.')
  })
})

// ───── Tool Execution: Steps ─────

describe('MCP Tools - Steps', () => {
  test('steps_list returns all steps', async () => {
    const result = await client.callTool({ name: 'steps_list', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { steps: unknown[] }
    expect(data.steps.length).toBeGreaterThanOrEqual(2)
  })

  test('steps_current returns the current eligible step', async () => {
    const result = await client.callTool({ name: 'steps_current', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result)
    expect(data).toBeDefined()
  })

  test('steps_get returns a specific step', async () => {
    const firstStepId = await getFirstStepId(client)
    const result = await client.callTool({ name: 'steps_get', arguments: { id: firstStepId } })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { id: string }
    expect(data.id).toBe(firstStepId)
  })

  test('steps_get returns error for non-existent step', async () => {
    const result = await client.callTool({ name: 'steps_get', arguments: { id: 'nonexistent' } })
    expect(result.isError).toBe(true)
  })

  test('steps_create creates a new step with unique number', async () => {
    const uniqueNum = `mcp-${Date.now()}`
    const result = await client.callTool({
      name: 'steps_create',
      arguments: {
        step_number: uniqueNum,
        title: 'MCP Test Step',
        objective: 'Testing MCP step creation',
      },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { id: string; title: string }
    expect(data.id).toContain('step-')
    expect(data.title).toBe('MCP Test Step')
  })

  test('steps_import returns error when project already has steps', async () => {
    const result = await client.callTool({
      name: 'steps_import',
      arguments: { steps: [{ step_number: '99', title: 'Late Import', objective: 'Should fail' }] },
    })
    expect(result.isError).toBe(true)
    const data = parseJsonContent(result) as { code: string }
    expect(data.code).toBe('ALREADY_SEEDED')
  })

  test('steps_update updates a step', async () => {
    const firstStepId = await getFirstStepId(client)
    const result = await client.callTool({
      name: 'steps_update',
      arguments: { id: firstStepId, title: 'Updated via MCP' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { updated: string }
    expect(data.updated).toContain('title')
  })

  test('steps_delete deletes a step', async () => {
    const lastStepId = await getLastStepId(client)
    const result = await client.callTool({ name: 'steps_delete', arguments: { id: lastStepId } })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { deleted: string }
    expect(data.deleted).toBe(lastStepId)
  })

  test('steps_create with empty objective returns error', async () => {
    const result = await client.callTool({
      name: 'steps_create',
      arguments: { step_number: '99', title: 'Bad', objective: '' },
    })
    expect(result.isError).toBe(true)
  })

  test('steps_create with duplicate step_number returns error', async () => {
    const result = await client.callTool({
      name: 'steps_create',
      arguments: { step_number: '1', title: 'Duplicate', objective: 'Should fail' },
    })
    expect(result.isError).toBe(true)
    const data = parseJsonContent(result) as { code: string }
    expect(data.code).toBe('DUPLICATE_STEP')
  })

  test('steps_update with empty id returns error', async () => {
    const result = await client.callTool({
      name: 'steps_update',
      arguments: { id: '', title: 'Should fail' },
    })
    expect(result.isError).toBe(true)
  })
})

// ───── Tool Execution: Step Actions ─────

describe('MCP Tools - Step Actions', () => {
  test('step_action transitions step from pending to in_progress', async () => {
    const firstStepId = await getFirstStepId(client)
    const result = await client.callTool({
      name: 'step_action',
      arguments: { id: firstStepId, action: 'start' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as {
      stepId: string
      action: string
      from: string
      to: string
    }
    expect(data.stepId).toBe(firstStepId)
    expect(data.action).toBe('start')
    expect(data.from).toBe('pending')
    expect(data.to).toBe('in_progress')
  })

  test('step_action returns error for non-existent step', async () => {
    const result = await client.callTool({
      name: 'step_action',
      arguments: { id: 'nonexistent', action: 'start' },
    })
    expect(result.isError).toBe(true)
  })

  test('step_action returns error for invalid transition', async () => {
    const firstStepId = await getFirstStepId(client)
    const result = await client.callTool({
      name: 'step_action',
      arguments: { id: firstStepId, action: 'invalid-action' },
    })
    expect(result.isError).toBe(true)
  })
})

// ───── Tool Execution: Prompts ─────

describe('MCP Tools - Prompts', () => {
  test('prompts_list returns prompt templates', async () => {
    const result = await client.callTool({ name: 'prompts_list', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { version: number; prompts: unknown[] }
    expect(data.version).toBe(3)
    expect(data.prompts.length).toBe(4)
  })

  test('prompts_render renders a prompt', async () => {
    const result = await client.callTool({
      name: 'prompts_render',
      arguments: { promptKey: 'step-generation', context: 'Build a login system' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { runId: string; messages: unknown[] }
    expect(data.runId).toMatch(/^pr-/)
    expect(data.messages.length).toBe(2)
  })

  test('prompts_complete marks a prompt run completed', async () => {
    const render = await client.callTool({
      name: 'prompts_render',
      arguments: { promptKey: 'step-generation', context: 'test' },
    })
    const renderData = parseJsonContent(render) as { runId: string }

    const result = await client.callTool({
      name: 'prompts_complete',
      arguments: { runId: renderData.runId, status: 'completed', outputRef: 'test-ref' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { status: string }
    expect(data.status).toBe('completed')
  })

  test('prompts_render returns error for unknown prompt key', async () => {
    const result = await client.callTool({
      name: 'prompts_render',
      arguments: { promptKey: 'unknown-key', context: 'test' },
    })
    expect(result.isError).toBe(true)
  })
})

// ───── Tool Execution: Scenarios ─────

describe('MCP Tools - Scenarios', () => {
  const stepId = 'step-1'

  test('scenarios_list returns scenarios for a step', async () => {
    const result = await client.callTool({ name: 'scenarios_list', arguments: { stepId } })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { scenarios: unknown[] }
    expect(Array.isArray(data.scenarios)).toBe(true)
  })

  test('scenarios_import imports scenarios with various priorities', async () => {
    const result = await client.callTool({
      name: 'scenarios_import',
      arguments: {
        stepId,
        scenarios: [
          { title: 'MCP Scenario 1', expected_result: 'Works', priority: 'critical' },
          { title: 'MCP Scenario 2', expected_result: 'Also works', priority: 'high' },
          { title: 'MCP Scenario 3', expected_result: 'Edge case', priority: 'medium' },
        ],
      },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { imported: number }
    expect(data.imported).toBe(3)
  })

  test('scenario_status_update updates scenario status', async () => {
    const scenarioId = await getScenarioId(client, stepId)
    const result = await client.callTool({
      name: 'scenario_status_update',
      arguments: { id: scenarioId, status: 'automated' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { status: string }
    expect(data.status).toBe('automated')
  })

  test('scenario_status_update returns error for invalid status', async () => {
    const scenarioId = await getScenarioId(client, stepId)
    const result = await client.callTool({
      name: 'scenario_status_update',
      arguments: { id: scenarioId, status: 'invalid' },
    })
    expect(result.isError).toBe(true)
  })

  test('scenarios_import with empty array returns error', async () => {
    const result = await client.callTool({
      name: 'scenarios_import',
      arguments: { stepId, scenarios: [] },
    })
    expect(result.isError).toBe(true)
  })

  test('scenario_status_update with non-existent id returns error', async () => {
    const result = await client.callTool({
      name: 'scenario_status_update',
      arguments: { id: 'sc-nonexistent', status: 'automated' },
    })
    expect(result.isError).toBe(true)
  })
})

// ───── Tool Execution: Design ─────

describe('MCP Tools - Design', () => {
  const stepId = 'step-1'

  test('design_get returns design for a step', async () => {
    const result = await client.callTool({ name: 'design_get', arguments: { stepId } })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { stepId: string; artifacts: unknown[] }
    expect(data.stepId).toBe(stepId)
    expect(Array.isArray(data.artifacts)).toBe(true)
  })

  test('design_import imports HLD and LLD', async () => {
    const result = await client.callTool({
      name: 'design_import',
      arguments: {
        stepId,
        hld: {
          summary: 'HLD',
          architecture: ['comp1'],
          data_flow: ['flow1'],
          integration_points: [],
          risks: [],
        },
        lld: {
          files: ['file.ts'],
          data_model: [],
          algorithms: [],
          implementation_order: ['1'],
          scenario_mapping: [],
        },
      },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { imported: string[] }
    expect(data.imported).toEqual(['hld', 'lld'])
  })

  test('design_get returns imported design', async () => {
    const result = await client.callTool({ name: 'design_get', arguments: { stepId } })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { artifacts: unknown[] }
    expect(data.artifacts.length).toBeGreaterThanOrEqual(2)
  })

  test('design_import returns error when hld missing', async () => {
    const result = await client.callTool({
      name: 'design_import',
      arguments: { stepId, lld: { files: [] } },
    })
    expect(result.isError).toBe(true)
  })

  test('design_import returns error when lld missing', async () => {
    const result = await client.callTool({
      name: 'design_import',
      arguments: { stepId, hld: { summary: 'HLD' } },
    })
    expect(result.isError).toBe(true)
  })

  test('design_get with non-existent step returns error', async () => {
    const result = await client.callTool({
      name: 'design_get',
      arguments: { stepId: 'step-nonexistent' },
    })
    expect(result.isError).toBe(true)
  })
})

// ───── Tool Execution: Test Suites ─────

describe('MCP Tools - Test Suites', () => {
  test('test_suites_create creates a test suite', async () => {
    const result = await client.callTool({
      name: 'test_suites_create',
      arguments: { stepId: 'step-1', name: 'MCP Test Suite' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { id: string; name: string }
    expect(data.id).toMatch(/^ts-/)
    expect(data.name).toBe('MCP Test Suite')
  })

  test('test_suites_status returns all suites', async () => {
    const result = await client.callTool({ name: 'test_suites_status', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { suites: unknown[] }
    expect(Array.isArray(data.suites)).toBe(true)
    expect(data.suites.length).toBeGreaterThanOrEqual(1)
  })

  test('test_suites_status with id returns specific suite', async () => {
    const suiteId = await getSuiteId(client)
    const result = await client.callTool({ name: 'test_suites_status', arguments: { id: suiteId } })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { id: string }
    expect(data.id).toBe(suiteId)
  })

  test('test_suites_run runs a test suite', async () => {
    const suiteId = await getSuiteId(client)
    const result = await client.callTool({ name: 'test_suites_run', arguments: { id: suiteId } })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { status: string; duration_ms: number }
    expect(typeof data.status).toBe('string')
    expect(typeof data.duration_ms).toBe('number')
  })

  test('test_suites_create with non-existent step returns error', async () => {
    const result = await client.callTool({
      name: 'test_suites_create',
      arguments: { stepId: 'step-nonexistent', name: 'Should fail' },
    })
    expect(result.isError).toBe(true)
  })

  test('test_suites_run with non-existent id returns error', async () => {
    const result = await client.callTool({
      name: 'test_suites_run',
      arguments: { id: 'ts-nonexistent' },
    })
    expect(result.isError).toBe(true)
  })

  test('test_suites_status with non-existent id returns error', async () => {
    const result = await client.callTool({
      name: 'test_suites_status',
      arguments: { id: 'ts-nonexistent' },
    })
    expect(result.isError).toBe(true)
  })
})

// ───── Tool Execution: Requirements ─────

describe('MCP Tools - Requirements', () => {
  test('requirements_list returns requirements', async () => {
    const result = await client.callTool({ name: 'requirements_list', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { requirements: unknown[] }
    expect(Array.isArray(data.requirements)).toBe(true)
  })

  test('requirements_add adds a requirement', async () => {
    const result = await client.callTool({
      name: 'requirements_add',
      arguments: { body: 'MCP requirement', source: 'test' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { id: string; source: string }
    expect(data.id).toMatch(/^req-/)
    expect(data.source).toBe('test')
  })

  test('requirements_add returns error with empty body', async () => {
    const result = await client.callTool({
      name: 'requirements_add',
      arguments: { body: '' },
    })
    expect(result.isError).toBe(true)
  })
})

// ───── Tool Execution: Worklog ─────

describe('MCP Tools - Worklog', () => {
  test('worklog returns recent entries', async () => {
    const result = await client.callTool({ name: 'worklog', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { entries: unknown[] }
    expect(Array.isArray(data.entries)).toBe(true)
    expect(data.entries.length).toBeGreaterThanOrEqual(1)
  })

  test('worklog with stepId returns entries for that step', async () => {
    const result = await client.callTool({ name: 'worklog', arguments: { stepId: 'step-1' } })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { entries: unknown[] }
    expect(Array.isArray(data.entries)).toBe(true)
  })

  test('worklog with non-existent stepId returns empty entries', async () => {
    const result = await client.callTool({ name: 'worklog', arguments: { stepId: 'step-nonexistent' } })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { entries: unknown[] }
    expect(Array.isArray(data.entries)).toBe(true)
  })
})

// ───── Tool Execution: Quality Gates ─────

describe('MCP Tools - Quality Gates', () => {
  test('quality_gates_run runs gates for a step', async () => {
    const result = await client.callTool({
      name: 'quality_gates_run',
      arguments: { stepId: 'step-1' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { stepId: string; gates: unknown[]; allPassed: boolean }
    expect(data.stepId).toBe('step-1')
    expect(data.gates.length).toBe(4)
    expect(typeof data.allPassed).toBe('boolean')
  })

  test('quality_gates_status returns gate run history', async () => {
    const result = await client.callTool({ name: 'quality_gates_status', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { runs: unknown[] }
    expect(Array.isArray(data.runs)).toBe(true)
    expect(data.runs.length).toBeGreaterThanOrEqual(4)
  })

  test('quality_gates_status with stepId returns filtered runs', async () => {
    const result = await client.callTool({
      name: 'quality_gates_status',
      arguments: { stepId: 'step-1' },
    })
    expect(result.isError).toBeFalsy()
    const data = parseJsonContent(result) as { runs: unknown[] }
    expect(Array.isArray(data.runs)).toBe(true)
  })

  test('quality_gates_run with non-existent stepId returns error', async () => {
    const result = await client.callTool({
      name: 'quality_gates_run',
      arguments: { stepId: 'nonexistent' },
    })
    expect(result.isError).toBe(true)
  })
})
