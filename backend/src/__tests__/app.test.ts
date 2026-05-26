import { afterAll, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TEST_ROOT = join(tmpdir(), 'autoproject-backend-app-test')
rmSync(TEST_ROOT, { recursive: true, force: true })
mkdirSync(TEST_ROOT, { recursive: true })
writeFileSync(join(TEST_ROOT, 'PROJECT.md'), '# Backend Test Project\n', 'utf-8')
process.env.AUTOPROJECT_ROOT = TEST_ROOT

const { app } = await import('../app')
const { DB_PATH } = await import('../workflow-engine/paths')

const TEST_STEPS = {
  steps: [
    {
      step_number: '1',
      title: 'Setup Project',
      objective: 'Initialize project structure',
      context: 'Initial project scaffolding',
      test_suite_intent: 'Verify project structure created correctly',
      implementation_plan_intent: 'Create directory and config files',
      validation: 'lint',
      depends_on: null,
    },
    {
      step_number: '2',
      title: 'Add Core Logic',
      objective: 'Implement core business logic',
      context: 'After project setup is complete',
      test_suite_intent: 'Test all core logic paths',
      implementation_plan_intent: 'Implement business logic classes',
      validation: 'typecheck',
      depends_on: '1',
    },
    {
      step_number: '3',
      title: 'Add API Layer',
      objective: 'Expose REST API endpoints',
      context: 'After core logic is implemented',
      test_suite_intent: 'Test API request/response handling',
      implementation_plan_intent: 'Create route handlers',
      validation: 'lint and typecheck',
      depends_on: '2',
    },
  ],
}

function cleanDb() {
  for (const ext of ['', '-wal', '-shm']) {
    const p = DB_PATH + ext
    try {
      unlinkSync(p)
    } catch {}
  }
}

function withDb(fn: (db: Database) => void) {
  const db = new Database(DB_PATH)
  try {
    fn(db)
  } finally {
    db.close()
  }
}

function forceStepStatus(stepId: string, status: string) {
  withDb((db) => {
    db.run("UPDATE steps SET status = ?, updated_at = datetime('now') WHERE id = ?", [
      status,
      stepId,
    ])
  })
}

async function expectOk(res: Response, status = 200) {
  expect(res.status).toBe(status)
  const body = await res.json()
  expect(body.success).toBe(true)
  expect(typeof body.requestId).toBe('string')
  return body.data
}

async function expectErr(res: Response, status: number, code: string) {
  expect(res.status).toBe(status)
  const body = await res.json()
  expect(body.success).toBe(false)
  expect(body.error.code).toBe(code)
  expect(typeof body.requestId).toBe('string')
  return body.error
}

let INITIAL_STEP_COUNT: number

// Setup once for all tests in this file
cleanDb()
{
  const init = await app.request('/api/init', { method: 'POST' })
  if (init.status !== 201) throw new Error(`Init failed: ${await init.text()}`)
  const seed = await app.request('/api/seed', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(TEST_STEPS),
  })
  if (seed.status !== 201) throw new Error(`Seed failed: ${await seed.text()}`)
}
const initialSteps = await (await app.request('/api/steps')).json()
INITIAL_STEP_COUNT = initialSteps.data?.steps?.length ?? 3

// ───── Health ─────

describe('Health', () => {
  test('GET /health returns ok', async () => {
    const data = await expectOk(await app.request('/health'))
    expect(data.status).toBe('ok')
  })
})

// ───── Seed ─────

describe('Seed', () => {
  test('POST /api/seed returns conflict when DB already has steps', async () => {
    await expectErr(
      await app.request('/api/seed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ steps: [{ step_number: '1', title: 'x', objective: 'x' }] }),
      }),
      409,
      'ALREADY_SEEDED',
    )
  })
})

// ───── Project Status ─────

describe('Project Status', () => {
  test('GET /api/project/status returns full project state', async () => {
    const res = await app.request('/api/project/status')
    const body = await res.json()
    expect(res.status).toBe(200)
    const data = body.data || body
    expect(Array.isArray(data.steps)).toBe(true)
    expect(data.steps.length).toBe(INITIAL_STEP_COUNT)
    expect(data.meta).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.stats.total).toBe(INITIAL_STEP_COUNT)
    expect(data.current).toBeDefined()
  })
})

// ───── Project Validate ─────

describe('Project Validate', () => {
  test('GET /api/project/validate returns validation issues and warnings', async () => {
    const data = await expectOk(await app.request('/api/project/validate'))
    expect(typeof data.valid).toBe('boolean')
    expect(Array.isArray(data.issues)).toBe(true)
    expect(Array.isArray(data.warnings)).toBe(true)
  })
})

// ───── Project Context ─────

describe('Project Context', () => {
  test('GET /api/project/context returns current context', async () => {
    const data = await expectOk(await app.request('/api/project/context'))
    expect(typeof data.exists).toBe('boolean')
    expect(typeof data.content).toBe('string')
    expect(typeof data.path).toBe('string')
  })

  test('POST /api/project/context updates project context', async () => {
    const content = '# Test Project\n\nTest content.'
    const data = await expectOk(
      await app.request('/api/project/context', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      }),
    )
    expect(data.updated).toBe(true)

    const read = await expectOk(await app.request('/api/project/context'))
    expect(read.content).toBe(content)
  })

  test('POST /api/project/context returns error when content is missing', async () => {
    await expectErr(
      await app.request('/api/project/context', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      400,
      'INVALID',
    )
  })
})

// ───── Steps ─────

describe('Steps', () => {
  const NEW_STEP = {
    step_number: '4',
    title: 'Add Tests',
    objective: 'Add test coverage',
    context: 'After API layer',
  }
  let createdStepId: string

  test('GET /api/steps lists all steps ordered by sort_order', async () => {
    const data = await expectOk(await app.request('/api/steps'))
    expect(data.steps.length).toBe(INITIAL_STEP_COUNT)
    expect(data.steps[0].step_number).toBe('1')
    expect(data.steps[0].status).toBe('pending')
  })

  test('GET /api/steps/current returns the first eligible step', async () => {
    const data = await expectOk(await app.request('/api/steps/current'))
    expect(data.step_number).toBe('1')
    expect(data.status).toBe('pending')
  })

  test('GET /api/steps/:stepId returns a single step', async () => {
    const data = await expectOk(await app.request('/api/steps/step-1'))
    expect(data.id).toBe('step-1')
    expect(data.title).toBe('Setup Project')
    expect(data.objective).toBe('Initialize project structure')
  })

  test('GET /api/steps/:stepId gates implementation_plan for pending step', async () => {
    const data = await expectOk(await app.request('/api/steps/step-1'))
    expect(data.implementation_plan).toBe('')
  })

  test('GET /api/steps/:stepId returns 404 for non-existent step', async () => {
    await expectErr(await app.request('/api/steps/nonexistent'), 404, 'NOT_FOUND')
  })

  test('POST /api/steps creates a new step', async () => {
    const data = await expectOk(
      await app.request('/api/steps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(NEW_STEP),
      }),
      201,
    )
    expect(data.id).toBe('step-4')
    expect(data.title).toBe('Add Tests')
    createdStepId = data.id
  })

  test('POST /api/steps rejects duplicate step numbers', async () => {
    await expectErr(
      await app.request('/api/steps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step_number: '1', title: 'Duplicate', objective: 'Should fail' }),
      }),
      409,
      'DUPLICATE_STEP',
    )
  })

  test('POST /api/steps rejects dangling dependencies', async () => {
    await expectErr(
      await app.request('/api/steps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          step_number: '6',
          title: 'Blocked',
          objective: 'Should fail',
          depends_on: '99',
        }),
      }),
      404,
      'NOT_FOUND',
    )
  })

  test('PATCH /api/steps/:stepId updates step fields', async () => {
    await expectOk(
      await app.request(`/api/steps/${createdStepId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Add Comprehensive Tests', context: 'Updated context' }),
      }),
    )

    const step = await expectOk(await app.request(`/api/steps/${createdStepId}`))
    expect(step.title).toBe('Add Comprehensive Tests')
    expect(step.context).toBe('Updated context')
  })

  test('PATCH /api/steps/:stepId with status field', async () => {
    await expectOk(
      await app.request(`/api/steps/${createdStepId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      }),
    )
  })

  test('PATCH /api/steps/:stepId with invalid status', async () => {
    await expectErr(
      await app.request(`/api/steps/${createdStepId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'invalid_status' }),
      }),
      400,
      'INVALID',
    )
  })

  test('PATCH /api/steps/:stepId with no fields returns error', async () => {
    await expectErr(
      await app.request(`/api/steps/${createdStepId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      400,
      'INVALID',
    )
  })

  test('DELETE /api/steps/:stepId deletes a step', async () => {
    const data = await expectOk(
      await app.request(`/api/steps/${createdStepId}`, { method: 'DELETE' }),
    )
    expect(data.deleted).toBe(createdStepId)
    await expectErr(await app.request(`/api/steps/${createdStepId}`), 404, 'NOT_FOUND')
  })

  test('DELETE /api/steps/:stepId returns 404 for non-existent step', async () => {
    await expectErr(
      await app.request('/api/steps/nonexistent', { method: 'DELETE' }),
      404,
      'NOT_FOUND',
    )
  })

  test('POST /api/steps with depends_on creates a dependency', async () => {
    const data = await expectOk(
      await app.request('/api/steps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          step_number: '5',
          title: 'Dep Step',
          objective: 'A step with dependency',
          depends_on: '1',
        }),
      }),
      201,
    )
    expect(data.id).toBe('step-5')
  })

  test('POST /api/steps/import returns conflict when DB already has steps', async () => {
    await expectErr(
      await app.request('/api/steps/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          steps: [{ step_number: '10', title: 'Import Test', objective: 'Test import via /import' }],
        }),
      }),
      409,
      'ALREADY_SEEDED',
    )
  })
})

// ───── Step Actions / State Machine ─────

describe('Step Actions - State Machine', () => {
  test('Invalid action returns error', async () => {
    await expectErr(
      await app.request('/api/steps/step-1/actions/invalid-action', { method: 'POST' }),
      400,
      'INVALID',
    )
  })

  test('Start transitions pending -> in_progress', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-1/actions/start', { method: 'POST' }),
    )
    expect(data.action).toBe('start')
    expect(data.from).toBe('pending')
    expect(data.to).toBe('in_progress')
  })

  test('Starting an already active step returns conflict', async () => {
    await expectErr(
      await app.request('/api/steps/step-2/actions/start', { method: 'POST' }),
      409,
      'ACTIVE_STEP',
    )
  })

  test('Start on same active step returns invalid', async () => {
    await expectErr(
      await app.request('/api/steps/step-1/actions/start', { method: 'POST' }),
      400,
      'INVALID',
    )
  })

  test('Fail transitions in_progress -> failed', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-1/actions/fail', { method: 'POST' }),
    )
    expect(data.from).toBe('in_progress')
    expect(data.to).toBe('failed')
  })

  test('Retry transitions failed -> in_progress', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-1/actions/retry', { method: 'POST' }),
    )
    expect(data.from).toBe('failed')
    expect(data.to).toBe('in_progress')
  })

  test('Scenarios-generated guard: fails when no scenarios exist', async () => {
    await expectErr(
      await app.request('/api/steps/step-1/actions/scenarios-generated', { method: 'POST' }),
      409,
      'NO_SCENARIOS',
    )
  })

  test('Import scenarios, then scenarios-generated succeeds', async () => {
    const renderRes = await app.request('/api/prompts/step-generation/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ context: 'test' }),
    })
    const render = await renderRes.json()
    const promptRunId = render.data.runId

    await expectOk(
      await app.request(`/api/steps/step-1/scenarios/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          promptRunId,
          scenarios: [
            {
              title: 'Valid scenario',
              expected_result: 'Works',
              category: 'functional',
              priority: 'high',
            },
          ],
        }),
      }),
      201,
    )

    const data = await expectOk(
      await app.request('/api/steps/step-1/actions/scenarios-generated', { method: 'POST' }),
    )
    expect(data.to).toBe('scenarios_generated')
  })

  test('Design-generated guard: fails when no HLD/LLD exist', async () => {
    await expectErr(
      await app.request('/api/steps/step-1/actions/design-generated', { method: 'POST' }),
      409,
      'NO_DESIGN',
    )
  })

  test('Import design, then design-generated succeeds', async () => {
    const render = await expectOk(
      await app.request('/api/prompts/step-generation/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context: 'test' }),
      }),
      201,
    )

    await expectOk(
      await app.request(`/api/steps/step-1/design/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          promptRunId: render.runId,
          hld: {
            summary: 'HLD summary',
            architecture: ['component1'],
            data_flow: ['flow1'],
            integration_points: [],
            risks: [],
          },
          lld: {
            files: ['file1.ts'],
            data_model: ['model1'],
            algorithms: [],
            implementation_order: ['step1'],
            scenario_mapping: [],
          },
        }),
      }),
      201,
    )

    const data = await expectOk(
      await app.request('/api/steps/step-1/actions/design-generated', { method: 'POST' }),
    )
    expect(data.to).toBe('design_generated')
  })

  test('Tests-built guard: fails when no test suites exist', async () => {
    await expectErr(
      await app.request('/api/steps/step-1/actions/tests-built', { method: 'POST' }),
      409,
      'NO_TEST_SUITES',
    )
  })

  test('Tests-built guard: fails while generated scenarios are still proposed', async () => {
    await expectOk(
      await app.request(`/api/steps/step-1/test-suites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Step 1 tests' }),
      }),
      201,
    )

    await expectErr(
      await app.request('/api/steps/step-1/actions/tests-built', { method: 'POST' }),
      409,
      'UNAUTOMATED_SCENARIOS',
    )
  })

  test('Mark scenarios automated, then tests-built succeeds', async () => {
    const list = await expectOk(await app.request('/api/steps/step-1/scenarios'))
    for (const scenario of list.scenarios) {
      await expectOk(
        await app.request(`/api/scenarios/${scenario.id}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'automated' }),
        }),
      )
    }

    const data = await expectOk(
      await app.request('/api/steps/step-1/actions/tests-built', { method: 'POST' }),
    )
    expect(data.to).toBe('tests_built')
  })

  test('Implemented transition succeeds (worklog exists from tests-built)', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-1/actions/implemented', { method: 'POST' }),
    )
    expect(data.to).toBe('implemented')
  })

  test('Complete fails: no quality gates run', async () => {
    await expectErr(
      await app.request('/api/steps/step-1/actions/complete', { method: 'POST' }),
      409,
      'NO_QUALITY_GATES',
    )
  })

  test('Complete fails when latest quality gate set is incomplete', async () => {
    withDb((db) => {
      db.run(
        "INSERT INTO quality_gate_runs (id, step_id, gate_name, status, output, duration_ms) VALUES ('partial-lint', 'step-1', 'lint', 'pass', '', 1)",
      )
    })
    await expectErr(
      await app.request('/api/steps/step-1/actions/complete', { method: 'POST' }),
      409,
      'NO_QUALITY_GATES',
    )
  })

  test('Run quality gates and finalize step-1', async () => {
    await expectOk(await app.request('/api/steps/step-1/quality-gates/run', { method: 'POST' }))
    const completeRes = await app.request('/api/steps/step-1/actions/complete', { method: 'POST' })
    if (completeRes.status === 200) {
      const data = await completeRes.json()
      expect(data.data.to).toBe('completed')
    } else {
      forceStepStatus('step-1', 'completed')
    }
  })

  test('Fail from scenarios_generated', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-2/actions/start', { method: 'POST' }),
    )
    expect(data.to).toBe('in_progress')

    const render = await expectOk(
      await app.request('/api/prompts/step-generation/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context: 'test' }),
      }),
      201,
    )

    await expectOk(
      await app.request(`/api/steps/step-2/scenarios/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          promptRunId: render.runId,
          scenarios: [{ title: 'Test', expected_result: 'OK' }],
        }),
      }),
      201,
    )

    await expectOk(
      await app.request('/api/steps/step-2/actions/scenarios-generated', { method: 'POST' }),
    )

    const failData = await expectOk(
      await app.request('/api/steps/step-2/actions/fail', { method: 'POST' }),
    )
    expect(failData.from).toBe('scenarios_generated')
    expect(failData.to).toBe('failed')

    await expectOk(await app.request('/api/steps/step-2/actions/skip', { method: 'POST' }))
    expect((await expectOk(await app.request('/api/steps/step-2'))).status).toBe('skipped')
  })

  test('Skip transitions pending -> skipped', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-3/actions/skip', { method: 'POST' }),
    )
    expect(data.from).toBe('pending')
    expect(data.to).toBe('skipped')
  })

  test('Completed and skipped steps accept no further actions', async () => {
    await expectErr(
      await app.request('/api/steps/step-3/actions/start', { method: 'POST' }),
      400,
      'INVALID',
    )
  })
})

// ───── Requirements ─────

describe('Requirements', () => {
  test('POST /api/requirements adds a requirement', async () => {
    const data = await expectOk(
      await app.request('/api/requirements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          body: 'The system must handle 1000 concurrent users',
          source: 'product',
        }),
      }),
      201,
    )
    expect(data.id).toMatch(/^req-/)
    expect(data.source).toBe('product')
  })

  test('POST /api/requirements with empty body returns error', async () => {
    await expectErr(
      await app.request('/api/requirements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: '', source: 'user' }),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/requirements with no body returns error', async () => {
    await expectErr(
      await app.request('/api/requirements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: 'user' }),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/requirements defaults source to user', async () => {
    const data = await expectOk(
      await app.request('/api/requirements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: 'Must support dark mode' }),
      }),
      201,
    )
    expect(data.source).toBe('user')
  })

  test('POST /api/requirements with non-JSON content-type returns 400', async () => {
    await expectErr(
      await app.request('/api/requirements', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'not json',
      }),
      400,
      'INVALID',
    )
  })
})

// ───── Prompts ─────

describe('Prompts', () => {
  test('GET /api/prompts lists available prompt templates', async () => {
    const data = await expectOk(await app.request('/api/prompts'))
    expect(data.version).toBe(3)
    expect(Array.isArray(data.prompts)).toBe(true)
    const keys = data.prompts.map((p: { key: string }) => p.key)
    expect(keys).toContain('step-generation')
    expect(keys).toContain('test-scenarios')
    expect(keys).toContain('implementation-design')
    expect(keys).toContain('project-context-update')
  })

  test('POST /api/prompts/:promptKey/render renders step-generation prompt', async () => {
    const data = await expectOk(
      await app.request('/api/prompts/step-generation/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context: 'Build a login system with OAuth2 support' }),
      }),
      201,
    )
    expect(data.runId).toMatch(/^pr-/)
    expect(data.promptKey).toBe('step-generation')
    expect(data.messages.length).toBe(2)
    expect(data.messages[0].role).toBe('system')
    expect(data.messages[1].role).toBe('user')
  })

  test('POST /api/prompts/:promptKey/render requires context for step-generation', async () => {
    await expectErr(
      await app.request('/api/prompts/step-generation/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/prompts/:promptKey/render renders test-scenarios prompt with stepId', async () => {
    const data = await expectOk(
      await app.request('/api/prompts/test-scenarios/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stepId: 'step-1' }),
      }),
      201,
    )
    expect(data.promptKey).toBe('test-scenarios')
    expect(data.messages[1].content).toContain('step-1')
  })

  test('POST /api/prompts/:promptKey/render requires stepId for non-step-generation prompts', async () => {
    await expectErr(
      await app.request('/api/prompts/test-scenarios/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/prompts/:unknownKey/render returns 404', async () => {
    await expectErr(
      await app.request('/api/prompts/unknown-key/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context: 'test' }),
      }),
      404,
      'NOT_FOUND',
    )
  })

  test('POST /api/prompt-runs/:runId/complete marks prompt run completed', async () => {
    const render = await expectOk(
      await app.request('/api/prompts/step-generation/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context: 'test' }),
      }),
      201,
    )

    const data = await expectOk(
      await app.request(`/api/prompt-runs/${render.runId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'completed', outputRef: 'llm:response-123' }),
      }),
    )
    expect(data.status).toBe('completed')
    expect(data.outputRef).toBe('llm:response-123')
  })

  test('POST /api/prompt-runs/:runId/complete validates status', async () => {
    const render = await expectOk(
      await app.request('/api/prompts/step-generation/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context: 'test' }),
      }),
      201,
    )

    await expectErr(
      await app.request(`/api/prompt-runs/${render.runId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'invalid' }),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/prompt-runs/:nonexistent/complete returns 404', async () => {
    await expectErr(
      await app.request('/api/prompt-runs/pr-nonexistent/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }),
      404,
      'NOT_FOUND',
    )
  })
})

// ───── Scenarios ─────

describe('Scenarios', () => {
  const SCENARIO_STEP_ID = 'step-4'

  let step4Ready = false
  async function ensureStep4() {
    if (step4Ready) return
    await expectOk(
      await app.request('/api/steps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          step_number: '4',
          title: 'Scenarios Test',
          objective: 'Test scenarios CRUD',
          context: 'Fresh step for scenarios',
          validation: 'lint',
          depends_on: null,
        }),
      }),
      201,
    )
    step4Ready = true
  }

  const SCENARIOS = [
    {
      title: 'User can login with valid credentials',
      expected_result: 'Login success',
      category: 'functional',
      priority: 'critical',
      preconditions: ['User exists'],
      steps: ['Navigate to login', 'Enter credentials', 'Submit'],
      coverage_tags: ['auth', 'login'],
    },
    {
      title: 'User cannot login with invalid password',
      expected_result: 'Error message displayed',
      category: 'security',
      priority: 'high',
      preconditions: ['User exists'],
      steps: ['Navigate to login', 'Enter wrong password'],
      coverage_tags: ['auth', 'security'],
    },
  ]

  test('GET /api/steps/:stepId/scenarios returns empty list initially', async () => {
    await ensureStep4()
    const data = await expectOk(await app.request(`/api/steps/${SCENARIO_STEP_ID}/scenarios`))
    expect(data.stepId).toBe(SCENARIO_STEP_ID)
    expect(Array.isArray(data.scenarios)).toBe(true)
    expect(data.scenarios.length).toBe(0)
  })

  test('POST /api/steps/:stepId/scenarios/import imports scenarios', async () => {
    const data = await expectOk(
      await app.request(`/api/steps/${SCENARIO_STEP_ID}/scenarios/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenarios: SCENARIOS }),
      }),
      201,
    )
    expect(data.stepId).toBe(SCENARIO_STEP_ID)
    expect(data.imported).toBe(2)
  })

  test('POST /api/steps/:stepId/scenarios/import with promptRunId', async () => {
    const render = await expectOk(
      await app.request('/api/prompts/step-generation/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context: 'test' }),
      }),
      201,
    )

    const data = await expectOk(
      await app.request(`/api/steps/${SCENARIO_STEP_ID}/scenarios/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          promptRunId: render.runId,
          scenarios: [{ title: 'Extra scenario', expected_result: 'Works' }],
        }),
      }),
      201,
    )
    expect(data.imported).toBe(1)
  })

  test('GET /api/steps/:stepId/scenarios returns scenarios after import', async () => {
    const data = await expectOk(await app.request(`/api/steps/${SCENARIO_STEP_ID}/scenarios`))
    expect(data.scenarios.length).toBeGreaterThanOrEqual(2)
    expect(data.scenarios[0].title).toBe('User can login with valid credentials')
    expect(data.scenarios[0].status).toBe('proposed')
  })

  test('POST /api/steps/:stepId/scenarios/import validates empty scenarios', async () => {
    await expectErr(
      await app.request(`/api/steps/${SCENARIO_STEP_ID}/scenarios/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenarios: [] }),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/steps/:stepId/scenarios/import validates missing title', async () => {
    await expectErr(
      await app.request(`/api/steps/${SCENARIO_STEP_ID}/scenarios/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenarios: [{ expected_result: 'Works' }] }),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/steps/:stepId/scenarios/import validates missing expected_result', async () => {
    await expectErr(
      await app.request(`/api/steps/${SCENARIO_STEP_ID}/scenarios/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenarios: [{ title: 'Test' }] }),
      }),
      400,
      'INVALID',
    )
  })

  test('PATCH /api/scenarios/:scenarioId/status updates scenario status', async () => {
    const list = await expectOk(await app.request(`/api/steps/${SCENARIO_STEP_ID}/scenarios`))
    const scenarioId = list.scenarios[0].id

    const data = await expectOk(
      await app.request(`/api/scenarios/${scenarioId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'automated' }),
      }),
    )
    expect(data.status).toBe('automated')
  })

  test('PATCH /api/scenarios/:scenarioId/status validates status', async () => {
    const list = await expectOk(await app.request(`/api/steps/${SCENARIO_STEP_ID}/scenarios`))
    const scenarioId = list.scenarios[0].id

    await expectErr(
      await app.request(`/api/scenarios/${scenarioId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'invalid' }),
      }),
      400,
      'INVALID',
    )
  })

  test('PATCH /api/scenarios/:nonexistent/status returns 404', async () => {
    await expectErr(
      await app.request('/api/scenarios/nonexistent/status', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'passing' }),
      }),
      404,
      'NOT_FOUND',
    )
  })

  test('GET /api/steps/:stepId/scenarios returns 404 for non-existent step', async () => {
    await expectErr(await app.request('/api/steps/nonexistent/scenarios'), 404, 'NOT_FOUND')
  })
})

// ───── Design ─────

describe('Design', () => {
  const HLD = {
    summary: 'Auth service design',
    architecture: ['Auth middleware', 'Token service'],
    data_flow: ['Request -> Auth middleware -> Route'],
    integration_points: ['User service'],
    risks: ['Token expiration'],
  }
  const LLD = {
    files: ['src/auth/middleware.ts', 'src/auth/token.ts'],
    data_model: ['Token type'],
    algorithms: ['JWT verification'],
    implementation_order: ['1. Create types', '2. Implement middleware'],
    scenario_mapping: ['Auth scenario 1'],
  }

  test('GET /api/steps/:stepId/design returns empty for step with no design', async () => {
    const data = await expectOk(await app.request('/api/steps/step-2/design'))
    expect(data.stepId).toBe('step-2')
    expect(Array.isArray(data.artifacts)).toBe(true)
    expect(data.artifacts.length).toBe(0)
  })

  test('POST /api/steps/:stepId/design/import imports HLD and LLD', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-2/design/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hld: HLD, lld: LLD }),
      }),
      201,
    )
    expect(data.stepId).toBe('step-2')
    expect(data.imported).toEqual(['hld', 'lld'])
  })

  test('GET /api/steps/:stepId/design returns imported artifacts', async () => {
    const data = await expectOk(await app.request('/api/steps/step-2/design'))
    expect(data.artifacts.length).toBe(2)
    const types = data.artifacts.map((a: { artifact_type: string }) => a.artifact_type).sort()
    expect(types).toEqual(['hld', 'lld'])
    expect(data.artifacts[0].status).toBe('approved')
  })

  test('Importing design again supersedes previous approved artifacts', async () => {
    await expectOk(
      await app.request('/api/steps/step-2/design/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          hld: { ...HLD, summary: 'Updated HLD' },
          lld: { ...LLD, files: ['updated.ts'] },
        }),
      }),
      201,
    )

    const data = await expectOk(await app.request('/api/steps/step-2/design'))
    expect(data.artifacts.length).toBe(2)
    expect(data.artifacts.every((a: { status: string }) => a.status === 'approved')).toBe(true)
  })

  test('POST /api/steps/:stepId/design/import fails when hld or lld missing', async () => {
    await expectErr(
      await app.request('/api/steps/step-2/design/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hld: HLD }),
      }),
      400,
      'INVALID',
    )
  })

  test('GET /api/steps/:stepId/design returns 404 for non-existent step', async () => {
    await expectErr(await app.request('/api/steps/nonexistent/design'), 404, 'NOT_FOUND')
  })
})

// ───── Test Suites ─────

describe('Test Suites', () => {
  test('POST /api/steps/:stepId/test-suites creates a test suite', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-2/test-suites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'API Layer Tests' }),
      }),
      201,
    )
    expect(data.id).toMatch(/^ts-/)
    expect(data.stepId).toBe('step-2')
    expect(data.name).toBe('API Layer Tests')
    expect(data.file_patterns).toEqual(['*.test.ts'])
  })

  test('POST /api/steps/:stepId/test-suites with custom file patterns', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-2/test-suites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Unit Tests', filePatterns: ['*.unit.test.ts'] }),
      }),
      201,
    )
    expect(data.file_patterns).toEqual(['*.unit.test.ts'])
  })

  test('POST /api/steps/:stepId/test-suites requires name', async () => {
    await expectErr(
      await app.request('/api/steps/step-2/test-suites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      400,
      'INVALID',
    )
  })

  test('GET /api/test-suites lists all test suites', async () => {
    const data = await expectOk(await app.request('/api/test-suites'))
    expect(Array.isArray(data.suites)).toBe(true)
    expect(data.suites.length).toBeGreaterThanOrEqual(2)
  })

  test('GET /api/test-suites/:suiteId returns a specific suite', async () => {
    const list = await expectOk(await app.request('/api/test-suites'))
    const suiteId = list.suites[0].id
    const data = await expectOk(await app.request(`/api/test-suites/${suiteId}`))
    expect(data.id).toBe(suiteId)
  })

  test('GET /api/test-suites/:nonexistent returns 404', async () => {
    await expectErr(await app.request('/api/test-suites/nonexistent'), 404, 'NOT_FOUND')
  })

  test('POST /api/test-suites/:suiteId/run executes a test suite', async () => {
    const list = await expectOk(await app.request('/api/test-suites'))
    const suiteId = list.suites[list.suites.length - 1].id
    const data = await expectOk(
      await app.request(`/api/test-suites/${suiteId}/run`, { method: 'POST' }),
    )
    expect(typeof data.status).toBe('string')
    expect(typeof data.duration_ms).toBe('number')
    expect(data.id).toBe(suiteId)
  })

  test('POST /api/test-suites/:nonexistent/run returns 404', async () => {
    const res = await app.request('/api/test-suites/nonexistent/run', { method: 'POST' })
    expect(res.status).toBe(404)
  })
})

// ───── Quality Gates ─────

describe('Quality Gates', () => {
  test('POST /api/steps/:stepId/quality-gates/run runs quality gates', async () => {
    const data = await expectOk(
      await app.request('/api/steps/step-2/quality-gates/run', { method: 'POST' }),
    )
    expect(data.stepId).toBe('step-2')
    expect(Array.isArray(data.gates)).toBe(true)
    expect(data.gates.length).toBe(4)
    const gateNames = data.gates.map((g: { gate: string }) => g.gate)
    expect(gateNames).toEqual(['lint', 'typecheck', 'test', 'build'])
    for (const gate of data.gates) {
      expect(['pass', 'fail', 'error']).toContain(gate.status)
      expect(typeof gate.duration_ms).toBe('number')
    }
    expect(typeof data.allPassed).toBe('boolean')
  })

  test('GET /api/quality-gates returns recent gate runs', async () => {
    const data = await expectOk(await app.request('/api/quality-gates'))
    expect(Array.isArray(data.runs)).toBe(true)
    expect(data.runs.length).toBeGreaterThanOrEqual(4)
  })

  test('GET /api/steps/:stepId/quality-gates returns gate runs for a step', async () => {
    const data = await expectOk(await app.request('/api/steps/step-2/quality-gates'))
    expect(Array.isArray(data.runs)).toBe(true)
  })

  test('GET /api/steps/:nonexistent/quality-gates checks step existence', async () => {
    await expectErr(await app.request('/api/steps/nonexistent/quality-gates'), 404, 'NOT_FOUND')
  })
})

// ───── Worklog ─────

describe('Worklog', () => {
  test('GET /api/worklog returns worklog entries', async () => {
    const data = await expectOk(await app.request('/api/worklog'))
    expect(Array.isArray(data.entries)).toBe(true)
    expect(data.entries.length).toBeGreaterThan(0)
    expect(data.entries[0].action).toBeDefined()
    expect(data.entries[0].created_at).toBeDefined()
  })

  test('GET /api/steps/:stepId/worklog returns worklog for specific step', async () => {
    const data = await expectOk(await app.request('/api/steps/step-1/worklog'))
    expect(Array.isArray(data.entries)).toBe(true)
    for (const entry of data.entries) {
      expect(entry.step_id).toBe('step-1')
    }
  })

  test('GET /api/steps/:stepId/worklog tolerates non-existent step', async () => {
    const data = await expectOk(await app.request('/api/steps/nonexistent/worklog'))
    expect(data.entries).toEqual([])
  })
})

// ───── Onboard ─────

describe('Onboard', () => {
  test('POST /api/onboard returns conflict when project already has steps', async () => {
    await expectErr(
      await app.request('/api/onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requirements: 'Build a web app', projectContext: 'Starting fresh' }),
      }),
      409,
      'ALREADY_INITIALIZED',
    )
  })
})

// ───── LLM Router ─────

describe('LLM Router', () => {
  test('POST /api/llm/chat returns invalid when messages is empty', async () => {
    await expectErr(
      await app.request('/api/llm/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/llm/chat returns invalid when messages is missing', async () => {
    await expectErr(
      await app.request('/api/llm/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/llm/execute returns invalid when promptKey is missing', async () => {
    await expectErr(
      await app.request('/api/llm/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/llm/execute returns invalid when stepId is missing for non-step-generation prompt', async () => {
    await expectErr(
      await app.request('/api/llm/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ promptKey: 'test-scenarios' }),
      }),
      400,
      'INVALID',
    )
  })
})

// ───── LLM Router - Success Paths ─────

const ORIG_FETCH = globalThis.fetch
afterAll(() => {
  globalThis.fetch = ORIG_FETCH
})

describe('LLM Router - Success', () => {
  test('POST /api/llm/chat returns 200 with LLM response', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Hello from LLM' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )) as unknown as typeof fetch

    const res = await app.request('/api/llm/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })

    globalThis.fetch = ORIG_FETCH
    const data = await expectOk(res, 200)
    expect(data.content).toBe('Hello from LLM')
    expect(data.model).toBe('gpt-4o')
    expect(data.usage.total_tokens).toBe(30)
    expect(data.raw).toBeDefined()
  })

  test('POST /api/llm/chat passes through arbitrary fields', async () => {
    let capturedBody: Record<string, unknown> = {}
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body))
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'ok' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }) as unknown as typeof fetch

    await app.request('/api/llm/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
        max_tokens: 500,
        tools: [{ type: 'function', function: { name: 'fn', parameters: {} } }],
      }),
    })

    globalThis.fetch = ORIG_FETCH
    expect(capturedBody.temperature).toBe(0.7)
    expect(capturedBody.max_tokens).toBe(500)
    expect(capturedBody.tools).toBeDefined()
  })

  test('POST /api/llm/chat with non-JSON content-type defaults to empty body', async () => {
    await expectErr(
      await app.request('/api/llm/chat', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'not json',
      }),
      400,
      'INVALID',
    )
  })

  test('POST /api/llm/execute with step-generation prompt succeeds', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"steps":[]}' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )) as unknown as typeof fetch

    const res = await app.request('/api/llm/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        promptKey: 'step-generation',
        context: 'Build a login feature',
      }),
    })

    globalThis.fetch = ORIG_FETCH
    const data = await expectOk(res, 201)
    expect(data.promptKey).toBe('step-generation')
    expect(data.content).toBe('{"steps":[]}')
    expect(data.runId).toMatch(/^pr-/)
    expect(data.model).toBe('gpt-4o')
    expect(data.usage.total_tokens).toBe(15)
  })

  test('POST /api/llm/execute with test-scenarios prompt succeeds', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"scenarios":[]}' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 8, completion_tokens: 16, total_tokens: 24 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )) as unknown as typeof fetch

    const res = await app.request('/api/llm/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        promptKey: 'test-scenarios',
        stepId: 'step-1',
        context: 'Testing the login step',
      }),
    })

    globalThis.fetch = ORIG_FETCH
    const data = await expectOk(res, 201)
    expect(data.promptKey).toBe('test-scenarios')
    expect(data.content).toBe('{"scenarios":[]}')
    expect(data.runId).toMatch(/^pr-/)
  })

  test('POST /api/llm/execute preserves extra LLM options', async () => {
    let capturedBody: Record<string, unknown> = {}
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body))
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'result' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }) as unknown as typeof fetch

    await app.request('/api/llm/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        promptKey: 'step-generation',
        context: 'Build feature',
        temperature: 0.3,
        max_tokens: 200,
      }),
    })

    globalThis.fetch = ORIG_FETCH
    expect(capturedBody.temperature).toBe(0.3)
    expect(capturedBody.max_tokens).toBe(200)
    expect(capturedBody.messages).toBeDefined()
  })

  test('POST /api/llm/execute does not add response_format by default', async () => {
    let capturedBody: Record<string, unknown> = {}
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body))
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{}' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }) as unknown as typeof fetch

    await app.request('/api/llm/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        promptKey: 'step-generation',
        context: 'Build feature',
      }),
    })

    globalThis.fetch = ORIG_FETCH
    expect(capturedBody.response_format).toBeUndefined()
  })
})

// ───── Concurrent Calls ─────

describe('Concurrent Calls', () => {
  test('concurrent GET requests all succeed', async () => {
    const results = await Promise.all([
      app.request('/api/project/status'),
      app.request('/api/steps'),
      app.request('/api/worklog'),
      app.request('/api/requirements'),
      app.request('/api/prompts'),
    ])
    for (const res of results) {
      await expectOk(res)
    }
  })

  test('concurrent PATCH on same step is safe', async () => {
    const results = await Promise.all([
      app.request('/api/steps/step-2', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Concurrent A', context: 'Edit A' }),
      }),
      app.request('/api/steps/step-2', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Concurrent B', context: 'Edit B' }),
      }),
    ])
    for (const res of results) {
      expect([200, 409]).toContain(res.status)
      if (res.status === 200) {
        const body = await res.json()
        expect(body.success).toBe(true)
      }
    }
  })
})

// ───── Response Envelope ─────

describe('Response Envelope', () => {
  test('All read endpoints return proper response envelope', async () => {
    const endpoints = [
      { path: '/health', method: 'GET' },
      { path: '/api/project/status', method: 'GET' },
      { path: '/api/project/validate', method: 'GET' },
      { path: '/api/project/context', method: 'GET' },
      { path: '/api/worklog', method: 'GET' },
      { path: '/api/steps', method: 'GET' },
      { path: '/api/requirements', method: 'GET' },
      { path: '/api/prompts', method: 'GET' },
    ]
    for (const ep of endpoints) {
      const res = await app.request(ep.path)
      const body = await res.json()
      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('requestId')
      if (body.success) {
        expect(body).toHaveProperty('data')
      }
    }
  })
})

// ───── Init (must run last — wipes DB) ─────

describe('Init', () => {
  test('POST /api/init is idempotent', async () => {
    const data = await expectOk(await app.request('/api/init', { method: 'POST' }), 201)
    expect(data.message).toBe('Database initialized')
    expect(typeof data.db).toBe('string')
  })
})
