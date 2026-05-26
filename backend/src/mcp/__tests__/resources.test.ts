import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getResourceNames } from './helpers'

const TEST_ROOT = join(tmpdir(), `autoproject-mcp-resources-${Date.now()}`)
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

describe('MCP Resources - Static', () => {
  test('listResources returns all 6 static resources', async () => {
    const result = await client.listResources()
    const names = getResourceNames(result.resources as { name: string }[])
    expect(names.length).toBe(6)
    expect(names).toContain('project-status')
    expect(names).toContain('project-context')
    expect(names).toContain('steps')
    expect(names).toContain('requirements')
    expect(names).toContain('prompts')
    expect(names).toContain('worklog')
  })

  test('Each static resource has a name, uri, description, and mimeType', async () => {
    const result = await client.listResources()
    for (const resource of result.resources as { name: string; uri: string; description?: string; mimeType?: string }[]) {
      expect(typeof resource.name).toBe('string')
      expect(typeof resource.uri).toBe('string')
      expect(resource.uri).toMatch(/^autoproject:\/\//)
      expect(typeof resource.description).toBe('string')
      expect(resource.description!.length).toBeGreaterThan(0)
      expect(typeof resource.mimeType).toBe('string')
    }
  })

  test('readResource project-status returns project state JSON', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://project/status' })
    const text: string = result.contents[0].text
    const data = JSON.parse(text) as { steps: unknown[] }
    expect(data.steps).toBeDefined()
    expect(data.steps.length).toBeGreaterThanOrEqual(2)
    expect(result.contents[0].mimeType).toBe('application/json')
  })

  test('readResource project-context returns markdown', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://project/context' })
    expect(result.contents[0].mimeType).toBe('text/markdown')
    expect(typeof result.contents[0].text).toBe('string')
    expect(result.contents[0].text).toBeTruthy()
  })

  test('readResource steps returns all steps', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://steps' })
    const data = JSON.parse(result.contents[0].text) as { steps: unknown[] }
    expect(data.steps.length).toBeGreaterThanOrEqual(2)
    expect(result.contents[0].mimeType).toBe('application/json')
  })

  test('readResource requirements returns requirements array', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://requirements' })
    const data = JSON.parse(result.contents[0].text) as { requirements: unknown[] }
    expect(Array.isArray(data.requirements)).toBe(true)
  })

  test('readResource prompts returns prompt templates', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://prompts' })
    const data = JSON.parse(result.contents[0].text) as { version: number; prompts: unknown[] }
    expect(data.version).toBeGreaterThanOrEqual(1)
    expect(data.prompts.length).toBeGreaterThanOrEqual(1)
  })

  test('readResource worklog returns recent entries', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://worklog' })
    const data = JSON.parse(result.contents[0].text) as { entries: unknown[] }
    expect(Array.isArray(data.entries)).toBe(true)
  })
})

describe('MCP Resources - Templates', () => {
  test('listResourceTemplates returns 4 template resources', async () => {
    const result = await client.listResourceTemplates()
    const names = (result.resourceTemplates as { name: string }[]).map((r) => r.name).sort()
    expect(names.length).toBe(4)
    expect(names).toContain('step-detail')
    expect(names).toContain('step-scenarios')
    expect(names).toContain('step-design')
    expect(names).toContain('step-quality-gates')
  })

  test('Each template has required fields', async () => {
    const result = await client.listResourceTemplates()
    for (const tmpl of result.resourceTemplates as { name: string; uriTemplate: string }[]) {
      expect(typeof tmpl.name).toBe('string')
      expect(typeof tmpl.uriTemplate).toBe('string')
      expect(tmpl.uriTemplate).toMatch(/^autoproject:\/\//)
    }
  })

  test('readResource step-detail with specific stepId', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://steps/step-1' })
    const data = JSON.parse(result.contents[0].text) as { id: string }
    expect(data.id).toBe('step-1')
    expect(result.contents[0].mimeType).toBe('application/json')
  })

  test('readResource step-scenarios with stepId', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://steps/step-1/scenarios' })
    const data = JSON.parse(result.contents[0].text) as { stepId: string }
    expect(data.stepId).toBe('step-1')
  })

  test('readResource step-design with stepId', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://steps/step-1/design' })
    const data = JSON.parse(result.contents[0].text) as { stepId: string }
    expect(data.stepId).toBe('step-1')
  })

  test('readResource step-quality-gates with stepId', async () => {
    const result: any = await client.readResource({ uri: 'autoproject://steps/step-1/quality-gates' })
    const data = JSON.parse(result.contents[0].text) as { runs: unknown[] }
    expect(Array.isArray(data.runs)).toBe(true)
  })

  test('readResource with non-existent step rejects with protocol error', async () => {
    await expect(
      client.readResource({ uri: 'autoproject://steps/nonexistent-step' }),
    ).rejects.toThrow(/not found/i)
  })

  test('readResource with non-existent URI prefix rejects', async () => {
    await expect(
      client.readResource({ uri: 'autoproject://bogus' }),
    ).rejects.toThrow()
  })
})
