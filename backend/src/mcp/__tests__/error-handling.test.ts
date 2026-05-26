import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TEST_ROOT = join(tmpdir(), `autoproject-mcp-errors-${Date.now()}`)
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

describe('MCP Error Handling - Unknown Tools', () => {
  test('non-existent tool name returns isError', async () => {
    const result = await client.callTool({ name: 'nonexistent_tool', arguments: {} })
    expect(result.isError).toBe(true)
  })

  test('non-existent tool name returns informative error', async () => {
    const result: any = await client.callTool({ name: 'totally_bogus_tool', arguments: {} })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBeTruthy()
  })
})

describe('MCP Error Handling - Missing Arguments', () => {
  test('steps_get with missing id returns isError', async () => {
    const result = await client.callTool({ name: 'steps_get', arguments: {} })
    expect(result.isError).toBe(true)
  })

  test('steps_delete with missing id returns isError', async () => {
    const result = await client.callTool({ name: 'steps_delete', arguments: {} })
    expect(result.isError).toBe(true)
  })

  test('step_action with missing action returns isError', async () => {
    const result = await client.callTool({ name: 'step_action', arguments: { id: 'step-1' } })
    expect(result.isError).toBe(true)
  })

  test('prompts_render with missing promptKey returns isError', async () => {
    const result = await client.callTool({ name: 'prompts_render', arguments: { context: 'test' } })
    expect(result.isError).toBe(true)
  })

  test('scenarios_import with missing stepId returns isError', async () => {
    const result = await client.callTool({
      name: 'scenarios_import',
      arguments: { scenarios: [{ title: 'Test', expected_result: 'OK' }] },
    })
    expect(result.isError).toBe(true)
  })

  test('steps_create with missing step_number returns isError', async () => {
    const result = await client.callTool({
      name: 'steps_create',
      arguments: { title: 'No number', objective: 'test' },
    })
    expect(result.isError).toBe(true)
  })
})

describe('MCP Error Handling - Business Logic Errors', () => {
  test('seed returns error when project already seeded', async () => {
    const result = await client.callTool({
      name: 'seed',
      arguments: { steps: [{ step_number: '99', title: 'Fail', objective: 'Should not work' }] },
    })
    expect(result.isError).toBe(true)
  })

  test('seed with empty steps array returns error', async () => {
    const result = await client.callTool({
      name: 'seed',
      arguments: { steps: [] },
    })
    expect(result.isError).toBe(true)
  })

  test('init is idempotent and succeeds on re-initialization', async () => {
    const result: any = await client.callTool({ name: 'init', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text) as { message: string }
    expect(data.message).toBe('Database initialized')
  })

  test('onboard succeeds after init clears the database', async () => {
    const result: any = await client.callTool({
      name: 'onboard',
      arguments: { requirements: 'Fresh requirements', projectContext: '# Fresh Project' },
    })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text) as { requirementId: string; message: string }
    expect(data.requirementId).toMatch(/^req-/)
    expect(data.message).toContain('Onboarded')
  })

  test('onboard returns error when called with empty requirements', async () => {
    const result = await client.callTool({
      name: 'onboard',
      arguments: { requirements: '', projectContext: '# Empty' },
    })
    expect(result.isError).toBe(true)
  })

  test('onboard returns error when called with empty projectContext', async () => {
    const result = await client.callTool({
      name: 'onboard',
      arguments: { requirements: 'Some req', projectContext: '' },
    })
    expect(result.isError).toBe(true)
  })

  test('prompts_complete with invalid status returns isError', async () => {
    const result = await client.callTool({
      name: 'prompts_complete',
      arguments: { runId: 'pr-fake', status: 'invalid-status' },
    })
    expect(result.isError).toBe(true)
  })

  test('prompts_complete with non-existent runId returns isError', async () => {
    const result = await client.callTool({
      name: 'prompts_complete',
      arguments: { runId: 'pr-nonexistent', status: 'completed' },
    })
    expect(result.isError).toBe(true)
  })

  test('scenarios_import with non-existent step returns isError', async () => {
    const result = await client.callTool({
      name: 'scenarios_import',
      arguments: {
        stepId: 'step-nonexistent',
        scenarios: [{ title: 'Fail', expected_result: 'Nope' }],
      },
    })
    expect(result.isError).toBe(true)
  })

  test('design_import with non-existent step returns isError', async () => {
    const result = await client.callTool({
      name: 'design_import',
      arguments: { stepId: 'step-nonexistent', hld: { x: 1 }, lld: { y: 2 } },
    })
    expect(result.isError).toBe(true)
  })
})
