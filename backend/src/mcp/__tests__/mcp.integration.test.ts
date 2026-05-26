import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getToolNames } from './helpers'

const TEST_ROOT = join(tmpdir(), `autoproject-mcp-integration-${Date.now()}`)
rmSync(TEST_ROOT, { recursive: true, force: true })
mkdirSync(TEST_ROOT, { recursive: true })
writeFileSync(join(TEST_ROOT, 'PROJECT.md'), '# MCP Integration Test\n', 'utf-8')

let client: Client
let transport: StdioClientTransport

beforeAll(async () => {
  transport = new StdioClientTransport({
    command: 'bun',
    args: [join(import.meta.dir, '..', 'index.ts')],
    env: {
      AUTOPROJECT_ROOT: TEST_ROOT,
      BUN_RUNTIME: '1',
    },
    stderr: 'pipe',
    cwd: join(import.meta.dir, '..', '..', '..'),
  })

  client = new Client(
    { name: 'mcp-integration-test-client', version: '0.1.0' },
    { capabilities: {} },
  )

  await client.connect(transport)
})

afterAll(async () => {
  try {
    await client.close()
  } catch {
    // best-effort
  }
  try {
    transport.close()
  } catch {
    // best-effort
  }
  try {
    rmSync(TEST_ROOT, { recursive: true, force: true })
  } catch {
    // Windows may hold SQLite WAL locks briefly
  }
})

describe('MCP Integration - Stdio Transport', () => {
  test('listTools returns registered tools', async () => {
    const result = await client.listTools()
    expect(result.tools).toBeDefined()
    const names = getToolNames(result.tools as { name: string }[])
    expect(names.length).toBe(32)
    expect(names).toContain('init')
    expect(names).toContain('project_status')
    expect(names).toContain('steps_list')
  })

  test('init initializes the database', async () => {
    const result: any = await client.callTool({ name: 'init', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text) as { message: string }
    expect(data.message).toBe('Database initialized')
  })

  test('seed imports initial steps', async () => {
    const result: any = await client.callTool({
      name: 'seed',
      arguments: {
        steps: [
          {
            step_number: '1',
            title: 'Integration Step 1',
            objective: 'Test step 1',
            depends_on: null,
          },
          {
            step_number: '2',
            title: 'Integration Step 2',
            objective: 'Test step 2',
            depends_on: '1',
          },
        ],
      },
    })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text) as { stepsCreated: number; steps: unknown[] }
    expect(data.stepsCreated).toBe(2)
    expect(data.steps.length).toBe(2)
  })

  test('project_status returns seeded steps', async () => {
    const result: any = await client.callTool({ name: 'project_status', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text) as { steps: unknown[]; stats: { total: number } }
    expect(data.steps.length).toBe(2)
    expect(data.stats.total).toBe(2)
  })

  test('steps_current returns the first eligible step', async () => {
    const result: any = await client.callTool({ name: 'steps_current', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text) as { id?: string }
    expect(data).toBeDefined()
  })

  test('steps_list returns all steps', async () => {
    const result: any = await client.callTool({ name: 'steps_list', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text) as { steps: unknown[] }
    expect(data.steps.length).toBe(2)
  })

  test('project_validate returns validation results', async () => {
    const result: any = await client.callTool({ name: 'project_validate', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text) as { valid: boolean; issues: unknown[]; warnings: unknown[] }
    expect(typeof data.valid).toBe('boolean')
  })

  test('listResources returns static resources', async () => {
    const result = await client.listResources()
    expect((result.resources as unknown[]).length).toBe(6)
  })

  test('readResource project-status works via stdio', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://project/status' })
    const data = JSON.parse(result.contents[0].text) as { steps: unknown[] }
    expect(data.steps).toBeDefined()
    expect(data.steps.length).toBeGreaterThanOrEqual(1)
  })

  test('callTool returns error for non-existent tool', async () => {
    const result: any = await client.callTool({ name: 'bogus_tool', arguments: {} })
    expect(result.isError).toBe(true)
  })

  test('multiple sequential tool calls work', async () => {
    const r1: any = await client.callTool({ name: 'project_status', arguments: {} })
    expect(r1.isError).toBeFalsy()

    const r2: any = await client.callTool({ name: 'project_validate', arguments: {} })
    expect(r2.isError).toBeFalsy()

    const r3: any = await client.callTool({ name: 'steps_current', arguments: {} })
    expect(r3.isError).toBeFalsy()
  })
})
