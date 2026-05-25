import { expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { BACKEND_URL, setupWorkflowLiveTests, LIVE_SUITE } from './setup'
import { fetchJSON, testRawReq, testReq, testSkip } from './helpers'
import { ROOT as SERVICE_ROOT } from '../paths'

setupWorkflowLiveTests()

const steps = [
  {
    step_number: '9001',
    title: 'Live E2E Setup',
    objective: 'Exercise workflow lifecycle through HTTP',
    implementation_plan_intent: 'This plan must stay hidden until tests are built',
    depends_on: null,
  },
  {
    step_number: '9002',
    title: 'Live E2E Follow-up',
    objective: 'Verify dependency ordering through HTTP',
    depends_on: '9001',
  },
]

async function request(method: string, path: string, body?: unknown) {
  const jsonBody = body === undefined ? undefined : JSON.stringify(body)
  return fetchJSON(`${BACKEND_URL}${path}`, {
    method,
    headers: jsonBody ? { 'Content-Type': 'application/json' } : undefined,
    body: jsonBody,
    _rawBody: body,
  })
}

function dataOf(body: unknown): Record<string, unknown> {
  expect(body).toBeObject()
  const envelope = body as { success?: boolean; data?: unknown }
  expect(envelope.success).toBe(true)
  expect(envelope.data).toBeObject()
  return envelope.data as Record<string, unknown>
}

LIVE_SUITE('[Live E2E] Workflow API lifecycle', () => {
  test('initializes and seeds a disposable workflow project', async () => {
    await testReq('Initialize workflow database', 'POST', `${BACKEND_URL}/api/init`, undefined, 201)
    await testReq(
      'Import live E2E steps',
      'POST',
      `${BACKEND_URL}/api/steps/import`,
      { steps },
      201,
      '9001',
    )
    await testReq(
      'Reject duplicate step import',
      'POST',
      `${BACKEND_URL}/api/steps/import`,
      { steps },
      409,
    )
  })

  test('reports current step and hides implementation plan before tests are built', async () => {
    const current = await request('GET', '/api/steps/current')
    expect(current.status).toBe(200)
    expect(dataOf(current.body).id).toBe('step-9001')

    const step = await request('GET', '/api/steps/step-9001')
    expect(step.status).toBe(200)
    expect(dataOf(step.body).implementation_plan).toBe('')
  })

  test('enforces ordering, artifacts, scenarios, and test-suite gates', async () => {
    await testReq(
      'Start first step',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/start`,
      undefined,
      200,
      'in_progress',
    )
    await testReq(
      'Reject starting dependent step while active',
      'POST',
      `${BACKEND_URL}/api/steps/step-9002/actions/start`,
      undefined,
      409,
    )
    await testReq(
      'Reject scenarios-generated before scenario import',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/scenarios-generated`,
      undefined,
      409,
    )

    await testReq(
      'Import test scenario',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/scenarios/import`,
      {
        scenarios: [
          { title: 'Happy path', expected_result: 'Workflow advances', priority: 'high' },
        ],
      },
      201,
      'imported',
    )
    await testReq(
      'Mark scenarios generated',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/scenarios-generated`,
      undefined,
      200,
      'scenarios_generated',
    )
    await testReq(
      'Reject design-generated before design import',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/design-generated`,
      undefined,
      409,
    )

    await testReq(
      'Import design artifacts',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/design/import`,
      { hld: { summary: 'HLD' }, lld: { files: ['live-e2e.ts'] } },
      201,
      'hld',
    )
    await testReq(
      'Mark design generated',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/design-generated`,
      undefined,
      200,
      'design_generated',
    )
    await testReq(
      'Reject tests-built before suite exists',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/tests-built`,
      undefined,
      409,
    )

    await testReq(
      'Create test suite',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/test-suites`,
      { name: 'Live E2E Suite', filePatterns: ['src/workflow-engine/__tests__/workflow.test.ts'] },
      201,
      'Live E2E Suite',
    )

    const scenarios = await request('GET', '/api/steps/step-9001/scenarios')
    const scenarioRows = dataOf(scenarios.body).scenarios as { id: string }[]
    expect(scenarioRows.length).toBeGreaterThan(0)
    await testReq(
      'Mark scenario automated',
      'PATCH',
      `${BACKEND_URL}/api/scenarios/${scenarioRows[0].id}/status`,
      { status: 'automated' },
      200,
      'automated',
    )
    await testReq(
      'Mark tests built',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/tests-built`,
      undefined,
      200,
      'tests_built',
    )

    const visible = await request('GET', '/api/steps/step-9001')
    expect(dataOf(visible.body).implementation_plan).toContain('hidden until tests are built')
  })

  test('validates prompts, project context, worklog, and error envelopes', async () => {
    await testReq(
      'List prompts',
      'GET',
      `${BACKEND_URL}/api/prompts`,
      undefined,
      200,
      'test-scenarios',
    )
    await testReq(
      'Render step prompt',
      'POST',
      `${BACKEND_URL}/api/prompts/test-scenarios/render`,
      { stepId: 'step-9001' },
      201,
      'runId',
    )
    await testReq(
      'Update project context',
      'POST',
      `${BACKEND_URL}/api/project/context`,
      { content: '# Live E2E Project\n' },
      200,
      'updated',
    )
    await testReq(
      'Validate project',
      'GET',
      `${BACKEND_URL}/api/project/validate`,
      undefined,
      200,
      'warnings',
    )
    await testReq(
      'Read worklog',
      'GET',
      `${BACKEND_URL}/api/steps/step-9001/worklog`,
      undefined,
      200,
      'tests-built',
    )
    await testRawReq(
      'Reject malformed JSON body',
      'POST',
      `${BACKEND_URL}/api/project/context`,
      { headers: { 'Content-Type': 'application/json' }, body: '{bad json' },
      400,
    )
  })

  test('completes only after quality gates pass and unlocks dependent step', async () => {
    await testReq(
      'Reject complete before implemented',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/complete`,
      undefined,
      400,
    )
    await testReq(
      'Mark implemented',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/implemented`,
      undefined,
      200,
      'implemented',
    )
    await testReq(
      'Reject complete before quality gates',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/complete`,
      undefined,
      409,
    )

    const canRunGates = existsSync(join(SERVICE_ROOT, 'package.json'))
    if (!canRunGates) {
      await testSkip(
        'Quality-gated completion and dependent-step unlock',
        'Service root has no package.json — gates require lint/check/test/build scripts',
      )
      return
    }

    await testReq(
      'Run quality gates',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/quality-gates/run`,
      undefined,
      200,
      'allPassed',
    )
    await testReq(
      'Complete first step',
      'POST',
      `${BACKEND_URL}/api/steps/step-9001/actions/complete`,
      undefined,
      200,
      'completed',
    )
    await testReq(
      'Dependent step becomes current',
      'GET',
      `${BACKEND_URL}/api/steps/current`,
      undefined,
      200,
      'step-9002',
    )
    await testReq(
      'Start dependent step',
      'POST',
      `${BACKEND_URL}/api/steps/step-9002/actions/start`,
      undefined,
      200,
      'in_progress',
    )
  }, 300000)

  test('manages step CRUD, 404 error envelopes, and missing-field validation via HTTP', async () => {
    await testReq('Reset DB', 'POST', `${BACKEND_URL}/api/init`, undefined, 201)
    await testReq(
      'Create step via POST /api/steps',
      'POST',
      `${BACKEND_URL}/api/steps`,
      { step_number: '9100', title: 'CRUD Test', objective: 'Test create/update/delete' },
      201,
      'step-9100',
    )

    const list = await request('GET', '/api/steps')
    const steps = dataOf(list.body).steps as { id: string }[]
    expect(steps.some((s) => s.id === 'step-9100')).toBe(true)

    await testReq('Update step title', 'PATCH', `${BACKEND_URL}/api/steps/step-9100`,
      { title: 'CRUD Test Updated' }, 200, 'title')

    const updated = await request('GET', '/api/steps/step-9100')
    expect(dataOf(updated.body).title).toBe('CRUD Test Updated')

    await testReq('Delete step', 'DELETE', `${BACKEND_URL}/api/steps/step-9100`,
      undefined, 200, 'step-9100')

    const deleted = await request('GET', '/api/steps/step-9100')
    const errorEnv = deleted.body as { success: boolean; error: { code: string } }
    expect(deleted.status).toBe(404)
    expect(errorEnv.success).toBe(false)
    expect(errorEnv.error.code).toBe('NOT_FOUND')

    await testReq('Create validation step', 'POST',
      `${BACKEND_URL}/api/steps`,
      { step_number: '9100', title: 'Validation', objective: 'Test missing fields' },
      201,
      'step-9100')

    await testReq('Reject empty design import', 'POST',
      `${BACKEND_URL}/api/steps/step-9100/design/import`, {}, 400)
    await testReq('Reject test suite without name', 'POST',
      `${BACKEND_URL}/api/steps/step-9100/test-suites`, {}, 400)
    await testReq('Reject context without content', 'POST',
      `${BACKEND_URL}/api/project/context`, {}, 400)
  })

  test('handles fail and retry cycle via HTTP', async () => {
    await testReq('Reset DB', 'POST', `${BACKEND_URL}/api/init`, undefined, 201)
    await testReq('Import step', 'POST', `${BACKEND_URL}/api/steps/import`,
      { steps: [{ step_number: '9101', title: 'FailRetry', objective: 'Test fail/retry' }] }, 201)
    await testReq('Start step', 'POST', `${BACKEND_URL}/api/steps/step-9101/actions/start`,
      undefined, 200, 'in_progress')

    await testReq('Fail step', 'POST', `${BACKEND_URL}/api/steps/step-9101/actions/fail`,
      undefined, 200, 'failed')

    const failed = await request('GET', '/api/steps/step-9101')
    expect(dataOf(failed.body).status).toBe('failed')

    await testReq('Retry step', 'POST', `${BACKEND_URL}/api/steps/step-9101/actions/retry`,
      undefined, 200, 'in_progress')

    const retried = await request('GET', '/api/steps/step-9101')
    expect(dataOf(retried.body).status).toBe('in_progress')
  })

  test('manages requirements and returns project status via HTTP', async () => {
    await testReq('Add requirement', 'POST', `${BACKEND_URL}/api/requirements`,
      { body: 'Live E2E requirement', source: 'e2e-test' }, 201, 'req-')

    const reqs = await request('GET', '/api/requirements')
    const reqData = dataOf(reqs.body)
    expect(reqData.requirements).toBeDefined()
    expect((reqData.requirements as unknown[]).length).toBeGreaterThan(0)

    const status = await request('GET', '/api/project/status')
    const sd = dataOf(status.body)
    expect(sd.steps).toBeDefined()
    expect(sd.stats).toBeDefined()
    expect(sd.meta).toBeDefined()
  })
})
