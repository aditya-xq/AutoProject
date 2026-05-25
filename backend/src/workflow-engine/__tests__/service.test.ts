import { describe, expect, test, afterEach } from 'bun:test'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AutoProjectService } from '../service'
import { PROMPTS_PATH, BACKEND_DIR } from '../paths'

const TEST_ROOT = join(tmpdir(), 'workflow-engine-service-test')
const _openDbs: AutoProjectService[] = []
let _testCounter = 0

function freshService(name: string) {
  _testCounter++
  const root = join(TEST_ROOT, `${name}-${_testCounter}`)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  const autoprojectDir = join(root, '.autoproject')
  const svc = new AutoProjectService({
    root,
    autoprojectDir,
    dbPath: join(autoprojectDir, 'autoproject.db'),
    promptsPath: PROMPTS_PATH,
    projectContextPath: join(root, 'PROJECT.md'),
    backendDir: BACKEND_DIR,
  })
  _openDbs.push(svc)
  return { root, autoprojectDir, service: svc }
}

afterEach(() => {
  for (const svc of _openDbs) {
    try {
      ;(svc as unknown as { closeDB(): void }).closeDB()
    } catch {}
  }
  _openDbs.length = 0
})

const TEST_STEPS = [
  {
    step_number: '1',
    title: 'Setup',
    objective: 'Initialize project structure',
    validation: 'lint',
    depends_on: null,
  },
  {
    step_number: '2',
    title: 'Core Logic',
    objective: 'Implement core business logic',
    validation: 'typecheck',
    depends_on: '1',
  },
  {
    step_number: '3',
    title: 'API Layer',
    objective: 'Expose REST API',
    validation: 'test',
    depends_on: '2',
  },
]

describe('AutoProjectService - init', () => {
  test('init creates database and agent assets', () => {
    const { autoprojectDir, service } = freshService('init-basic')
    const result = service.init() as { message: string; db: string; assets: { created: string[] } }
    expect(result.message).toBe('Database initialized')
    expect(result.db).toContain('autoproject.db')
    expect(existsSync(join(autoprojectDir, 'AGENTS.md'))).toBe(true)
    expect(existsSync(join(autoprojectDir, 'mcp.json'))).toBe(true)
  })

  test('init is idempotent', () => {
    const { service } = freshService('init-idempotent')
    service.init()
    expect(() => service.init()).not.toThrow()
  })
})

describe('AutoProjectService - seed', () => {
  test('seed imports steps', () => {
    const { service } = freshService('seed-basic')
    service.init()
    const result = service.seed({ steps: TEST_STEPS }) as { stepsCreated: number }
    expect(result.stepsCreated).toBe(3)
  })

  test('seed returns conflict when already seeded', () => {
    const { service } = freshService('seed-twice')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    expect(() => service.seed({ steps: TEST_STEPS })).toThrow(/already has steps/i)
  })

  test('seed rejects empty steps', () => {
    const { service } = freshService('seed-empty')
    service.init()
    expect(() => service.seed({ steps: [] })).toThrow('steps array is required')
  })

  test('importSteps works identically to seed', () => {
    const { service } = freshService('import-steps')
    service.init()
    const result = service.importSteps({ steps: TEST_STEPS }) as { stepsCreated: number }
    expect(result.stepsCreated).toBe(3)
    const { steps } = service.listSteps()
    expect(steps.length).toBe(3)
  })
})

describe('AutoProjectService - steps CRUD', () => {
  test('listSteps returns empty before seeding', () => {
    const { service } = freshService('steps-empty')
    service.init()
    const { steps } = service.listSteps()
    expect(steps).toEqual([])
  })

  test('listSteps returns seeded steps in order', () => {
    const { service } = freshService('steps-list')
    service.init()
    service.seed({ steps: TEST_STEPS })
    const { steps } = service.listSteps()
    expect(steps.length).toBe(3)
    expect(steps[0].step_number).toBe('1')
    expect(steps[0].status).toBe('pending')
  })

  test('currentStep returns first eligible step', () => {
    const { service } = freshService('steps-current')
    service.init()
    service.seed({ steps: TEST_STEPS })
    const step = service.currentStep() as { step_number: string }
    expect(step.step_number).toBe('1')
  })

  test('createStep creates a new step with auto increment', () => {
    const { service } = freshService('steps-create')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    const step = service.createStep({
      step_number: '2',
      title: 'New Step',
      objective: 'Do something',
    }) as { id: string }
    expect(step.id).toBe('step-2')
    const { steps } = service.listSteps()
    expect(steps.length).toBe(2)
  })

  test('createStep rejects duplicates', () => {
    const { service } = freshService('steps-create-dupe')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    expect(() =>
      service.createStep({ step_number: '1', title: 'Duplicate', objective: 'Should fail' }),
    ).toThrow(/already exists/i)
  })

  test('updateStep updates fields', () => {
    const { service } = freshService('steps-update')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    const result = service.updateStep('step-1', { title: 'Updated', context: 'New context' }) as {
      updated: string[]
    }
    expect(result.updated).toContain('title')
    const step = service.getStep('step-1')
    expect(step.title).toBe('Updated')
    expect(step.context).toBe('New context')
  })

  test('updateStep rejects invalid status', () => {
    const { service } = freshService('steps-update-bad')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    expect(() => service.updateStep('step-1', { status: 'bogus' as never })).toThrow(
      "Invalid status 'bogus'",
    )
  })

  test('deleteStep removes a step', () => {
    const { service } = freshService('steps-delete')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    service.deleteStep('step-1')
    expect(() => service.getStep('step-1')).toThrow("Step 'step-1' not found")
  })

  test('getStep returns 404 for non-existent', () => {
    const { service } = freshService('steps-get-404')
    service.init()
    expect(() => service.getStep('nonexistent')).toThrow("Step 'nonexistent' not found")
  })
})

describe('AutoProjectService - step actions', () => {
  function setup() {
    const ctx = freshService('step-actions')
    ctx.service.init()
    ctx.service.seed({ steps: TEST_STEPS })
    return ctx
  }

  test('start transitions pending to in_progress', () => {
    const { service } = setup()
    const result = service.stepAction('step-1', 'start') as { from: string; to: string }
    expect(result.from).toBe('pending')
    expect(result.to).toBe('in_progress')
  })

  test('start on active step returns conflict', () => {
    const { service } = setup()
    service.stepAction('step-1', 'start')
    expect(() => service.stepAction('step-2', 'start')).toThrow(/active/i)
  })

  test('invalid action returns error', () => {
    const { service } = setup()
    expect(() => service.stepAction('step-1', 'invalid-action')).toThrow(/cannot/i)
  })

  test('skip transitions pending to skipped', () => {
    const { service } = setup()
    const result = service.stepAction('step-1', 'skip') as { to: string }
    expect(result.to).toBe('skipped')
  })
})

describe('AutoProjectService - project context', () => {
  test('getProjectContext returns empty when no context file', () => {
    const { service } = freshService('ctx-empty')
    service.init()
    const ctx = service.getProjectContext()
    expect(ctx.exists).toBe(false)
    expect(ctx.content).toBe('')
  })

  test('updateProjectContext writes and reads context', () => {
    const { service } = freshService('ctx-write')
    service.init()
    service.updateProjectContext('# My Project\n\nHello World')
    const ctx = service.getProjectContext()
    expect(ctx.exists).toBe(true)
    expect(ctx.content).toContain('My Project')
  })
})

describe('AutoProjectService - requirements', () => {
  test('addRequirement creates requirement', () => {
    const { service } = freshService('req-add')
    service.init()
    const req = service.addRequirement({ body: 'Build a login system', source: 'product' }) as {
      id: string
      source: string
    }
    expect(req.id).toMatch(/^req-/)
    expect(req.source).toBe('product')
  })

  test('addRequirement defaults source to user', () => {
    const { service } = freshService('req-default')
    service.init()
    const req = service.addRequirement({ body: 'Must support dark mode' }) as { source: string }
    expect(req.source).toBe('user')
  })

  test('listRequirements returns added requirements', () => {
    const { service } = freshService('req-list')
    service.init()
    service.addRequirement({ body: 'Req 1' })
    service.addRequirement({ body: 'Req 2' })
    const { requirements } = service.listRequirements()
    expect(requirements.length).toBe(2)
  })
})

describe('AutoProjectService - scenarios', () => {
  function setup() {
    const ctx = freshService('scenarios')
    ctx.service.init()
    ctx.service.seed({ steps: [TEST_STEPS[0]] })
    return ctx
  }

  test('importScenarios imports scenarios', () => {
    const { service } = setup()
    const result = service.importScenarios('step-1', {
      scenarios: [
        { title: 'Login', expected_result: 'Success', priority: 'high' },
        { title: 'Logout', expected_result: 'Complete', priority: 'medium' },
      ],
    }) as { imported: number }
    expect(result.imported).toBe(2)
  })

  test('importScenarios rejects empty array', () => {
    const { service } = setup()
    expect(() => service.importScenarios('step-1', { scenarios: [] })).toThrow(/non-empty/i)
  })

  test('importScenarios rejects missing title', () => {
    const { service } = setup()
    expect(() =>
      service.importScenarios('step-1', { scenarios: [{ expected_result: 'OK' }] }),
    ).toThrow(/title/)
  })

  test('listScenarios returns imported scenarios', () => {
    const { service } = setup()
    service.importScenarios('step-1', { scenarios: [{ title: 'Test', expected_result: 'OK' }] })
    const result = service.listScenarios('step-1') as { scenarios: { id: string; title: string }[] }
    expect(result.scenarios.length).toBe(1)
    expect(result.scenarios[0].title).toBe('Test')
  })

  test('updateScenarioStatus updates status', () => {
    const { service } = setup()
    service.importScenarios('step-1', { scenarios: [{ title: 'Test', expected_result: 'OK' }] })
    const listResult = service.listScenarios('step-1') as { scenarios: { id: string }[] }
    const result = service.updateScenarioStatus(listResult.scenarios[0].id, {
      status: 'automated',
    }) as { status: string }
    expect(result.status).toBe('automated')
  })

  test('updateScenarioStatus rejects invalid status', () => {
    const { service } = setup()
    expect(() => service.updateScenarioStatus('sc-test', { status: 'invalid' })).toThrow(/invalid/i)
  })
})

describe('AutoProjectService - design', () => {
  function setup() {
    const ctx = freshService('design')
    ctx.service.init()
    ctx.service.seed({ steps: [TEST_STEPS[0]] })
    return ctx
  }

  test('importDesign imports HLD and LLD', () => {
    const { service } = setup()
    const result = service.importDesign('step-1', {
      hld: {
        summary: 'HLD',
        architecture: [] as string[],
        data_flow: [] as string[],
        integration_points: [] as string[],
        risks: [] as string[],
      },
      lld: {
        files: ['test.ts'],
        data_model: [] as string[],
        algorithms: [] as string[],
        implementation_order: [] as string[],
        scenario_mapping: [] as string[],
      },
    }) as { imported: string[] }
    expect(result.imported).toEqual(['hld', 'lld'])
  })

  test('importDesign rejects missing hld', () => {
    const { service } = setup()
    expect(() =>
      service.importDesign('step-1', { lld: { files: [] as string[] } as never }),
    ).toThrow(/hld and lld are required/i)
  })

  test('getDesign returns imported artifacts', () => {
    const { service } = setup()
    service.importDesign('step-1', {
      hld: {
        summary: 'HLD',
        architecture: [] as string[],
        data_flow: [] as string[],
        integration_points: [] as string[],
        risks: [] as string[],
      },
      lld: {
        files: ['test.ts'],
        data_model: [] as string[],
        algorithms: [] as string[],
        implementation_order: [] as string[],
        scenario_mapping: [] as string[],
      },
    })
    const { artifacts } = service.getDesign('step-1')
    expect(artifacts.length).toBe(2)
  })
})

describe('AutoProjectService - test suites', () => {
  function setup() {
    const ctx = freshService('testsuites')
    ctx.service.init()
    ctx.service.seed({ steps: [TEST_STEPS[0]] })
    return ctx
  }

  test('createTestSuite creates a suite', () => {
    const { service } = setup()
    const result = service.createTestSuite('step-1', { name: 'Core Tests' }) as {
      id: string
      name: string
    }
    expect(result.id).toMatch(/^ts-/)
    expect(result.name).toBe('Core Tests')
  })

  test('createTestSuite requires name', () => {
    const { service } = setup()
    expect(() => service.createTestSuite('step-1', {} as never)).toThrow(/name is required/i)
  })

  test('testSuiteStatus lists suites', () => {
    const { service } = freshService('testsuites')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    service.createTestSuite('step-1', { name: 'Suite 1' })
    const result = service.testSuiteStatus() as { suites: unknown[] }
    expect(result.suites.length).toBe(1)
  })

  test('testSuiteStatus returns suite by id', () => {
    const { service } = freshService('testsuites-by-id')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    const suite = service.createTestSuite('step-1', { name: 'Suite 1' }) as { id: string }
    const result = service.testSuiteStatus(suite.id) as Record<string, unknown>
    expect(result.id).toBe(suite.id)
    expect(result.name).toBe('Suite 1')
  })

  test('testSuiteStatus throws on missing id', () => {
    const { service } = freshService('testsuites-missing')
    service.init()
    expect(() => service.testSuiteStatus('ts-nonexistent')).toThrow(/not found/i)
  })

  test('runTestSuite runs and returns result', () => {
    const { service } = freshService('testsuites-run')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    const suite = service.createTestSuite('step-1', {
      name: 'Run Suite',
      filePatterns: ['__opencode_test_does_not_exist__'],
    }) as { id: string }
    const result = service.runTestSuite(suite.id) as { id: string; status: string; duration_ms: number }
    expect(result.id).toBe(suite.id)
    expect(['passing', 'failing', 'error']).toContain(result.status)
    expect(typeof result.duration_ms).toBe('number')
  })

  test('runTestSuite throws on missing suite', () => {
    const { service } = freshService('testsuites-run-missing')
    service.init()
    expect(() => service.runTestSuite('ts-nonexistent')).toThrow(/not found/i)
  })
})

describe('AutoProjectService - quality gates', () => {
  test('qualityGateStatus returns empty runs without stepId', () => {
    const { service } = freshService('qg-all')
    service.init()
    const result = service.qualityGateStatus() as { runs: unknown[] }
    expect(Array.isArray(result.runs)).toBe(true)
    expect(result.runs.length).toBe(0)
  })

  test('qualityGateStatus returns empty runs for valid stepId', () => {
    const { service } = freshService('qg-step')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    const result = service.qualityGateStatus('step-1') as { runs: unknown[] }
    expect(Array.isArray(result.runs)).toBe(true)
    expect(result.runs.length).toBe(0)
  })

  test('qualityGateStatus throws for invalid stepId', () => {
    const { service } = freshService('qg-invalid')
    service.init()
    expect(() => service.qualityGateStatus('step-nonexistent')).toThrow(/not found/i)
  })
})

describe('AutoProjectService - validation', () => {
  test('validateProject throws when not initialized', () => {
    const { service } = freshService('validate-nodb')
    expect(() => service.validateProject()).toThrow(/not initialized/i)
  })
})

describe('AutoProjectService - prompts', () => {
  test('listPrompts returns prompts', () => {
    const { service } = freshService('prompts-list')
    service.init()
    const result = service.listPrompts() as { version: number; prompts: unknown[] }
    expect(result.version).toBe(3)
    expect(result.prompts.length).toBeGreaterThanOrEqual(3)
  })

  test('renderPrompt renders step-generation', () => {
    const { service } = freshService('prompts-render')
    service.init()
    const result = service.renderPrompt('step-generation', { context: 'Build a login system' }) as {
      runId: string
    }
    expect(result.runId).toMatch(/^pr-/)
  })

  test('renderPrompt requires context for step-generation', () => {
    const { service } = freshService('prompts-render-fail')
    service.init()
    expect(() => service.renderPrompt('step-generation', {})).toThrow()
  })

  test('completePrompt marks prompt completed', () => {
    const { service } = freshService('prompts-complete')
    service.init()
    const render = service.renderPrompt('step-generation', { context: 'test' }) as { runId: string }
    const result = service.completePrompt(render.runId, {
      status: 'completed',
      outputRef: 'ref',
    }) as { status: string }
    expect(result.status).toBe('completed')
  })
})

describe('AutoProjectService - worklog', () => {
  test('worklog returns entries', () => {
    const { service } = freshService('worklog')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    service.stepAction('step-1', 'start')
    const { entries } = service.worklog()
    expect(entries.length).toBeGreaterThanOrEqual(1)
  })

  test('worklog filters by stepId', () => {
    const { service } = freshService('worklog-filter')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    service.stepAction('step-1', 'start')
    const result = service.worklog('step-1') as { entries: { step_id: string }[] }
    for (const entry of result.entries) {
      expect(entry.step_id).toBe('step-1')
    }
  })
})

describe('AutoProjectService - project validation', () => {
  test('validateProject returns valid for fresh seed', () => {
    const { service } = freshService('validate')
    service.init()
    const result = service.validateProject() as {
      valid: boolean
      issues: unknown[]
      warnings: unknown[]
    }
    expect(typeof result.valid).toBe('boolean')
    expect(Array.isArray(result.issues)).toBe(true)
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  test('projectStatus returns full state', () => {
    const { service } = freshService('status')
    service.init()
    service.seed({ steps: TEST_STEPS })
    const status = service.projectStatus() as {
      steps: unknown[]
      stats: { total: number }
      current: unknown
      meta: unknown
    }
    expect(status.steps.length).toBe(3)
    expect(status.stats.total).toBe(3)
    expect(status.current).toBeDefined()
    expect(status.meta).toBeDefined()
  })
})

describe('AutoProjectService - onboard', () => {
  test('onboard creates project with steps', () => {
    const { service } = freshService('onboard-ok')
    service.init()
    const result = service.onboard({
      requirements: 'Build a web app',
      projectContext: 'Starting fresh project',
      steps: TEST_STEPS,
    }) as { message: string; requirementId: string; stepsCreated: number }
    expect(result.message).toContain('Onboarded')
    expect(result.requirementId).toMatch(/^req-/)
    expect(result.stepsCreated).toBe(3)
    const ctx = service.getProjectContext()
    expect(ctx.exists).toBe(true)
    expect(ctx.content).toContain('Starting fresh project')
  })

  test('onboard rejects when already initialized', () => {
    const { service } = freshService('onboard-twice')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    expect(() =>
      service.onboard({ requirements: 'Another project', projectContext: 'More context' }),
    ).toThrow(/already has steps/i)
  })

  test('onboard without steps returns next steps', () => {
    const { service } = freshService('onboard-no-steps')
    service.init()
    const result = service.onboard({
      requirements: 'New project',
      projectContext: 'Brand new',
    }) as { next: string[] }
    expect(result.next).toBeDefined()
    expect(result.next).toContain('prompts_execute:step-generation')
  })

  test('onboard wraps all DB writes in a transaction', () => {
    const { service } = freshService('onboard-transaction')
    service.init()
    // Manually insert a step to trigger ALREADY_INITIALIZED inside the transaction
    service.seed({ steps: [TEST_STEPS[0]] })
    // Attempting onboard should throw and leave NO partial state
    expect(() =>
      service.onboard({ requirements: 'Should fail', projectContext: 'Some context' }),
    ).toThrow(/already has steps/i)
    // The existing steps should still be intact
    const { steps } = service.listSteps()
    expect(steps.length).toBe(1)
  })
})

describe('AutoProjectService - updateScenarioStatus validation', () => {
  test('rejects empty status', () => {
    const { service } = freshService('scenario-status-empty')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    expect(() => service.updateScenarioStatus('sc-test', { status: '' })).toThrow(
      'status is required',
    )
  })

  test('rejects missing status field', () => {
    const { service } = freshService('scenario-status-missing')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    expect(() => service.updateScenarioStatus('sc-test', {} as { status?: string })).toThrow(
      'status is required',
    )
  })
})

describe('AutoProjectService - closeDB and dispose', () => {
  test('closeDB is idempotent', () => {
    const { service } = freshService('close-idempotent')
    service.init()
    expect(() => service.closeDB()).not.toThrow()
    expect(() => service.closeDB()).not.toThrow()
  })

  test('Symbol.dispose closes the DB', () => {
    const { service } = freshService('dispose')
    service.init()
    expect(() => (service as unknown as { [Symbol.dispose](): void })[Symbol.dispose]()).not.toThrow()
  })
})

describe('AutoProjectService - renderPrompt project-context-update', () => {
  test('renderPrompt merges project context for project-context-update', () => {
    const { service, root } = freshService('prompts-pcu')
    service.init()
    service.updateProjectContext('# Existing Context\n\nSome project details')
    const result = service.renderPrompt('project-context-update', {
      context: 'New step context',
    }) as { runId: string; messages: { role: string; content: string }[] }
    expect(result.runId).toMatch(/^pr-/)
    const userMsg = result.messages.find((m) => m.role === 'user')
    expect(userMsg).toBeDefined()
    expect(userMsg!.content).toContain('current_project_md')
    expect(userMsg!.content).toContain('Existing Context')
    expect(userMsg!.content).toContain('New step context')
  })

  test('renderPrompt project-context-update works without project context file', () => {
    const { service } = freshService('prompts-pcu-noctx')
    service.init()
    const result = service.renderPrompt('project-context-update', {
      context: 'Just context',
    }) as { runId: string }
    expect(result.runId).toMatch(/^pr-/)
  })
})

describe('AutoProjectService - concurrent and rapid transitions', () => {
  test('rapid sequential state machine transitions', () => {
    const { service } = freshService('rapid-seq')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    service.stepAction('step-1', 'start')
    service.stepAction('step-1', 'fail')
    service.stepAction('step-1', 'skip')
    const step = service.getStep('step-1')
    expect(step.status).toBe('skipped')
  })

  test('double-start on already started step fails', () => {
    const { service } = freshService('double-start')
    service.init()
    service.seed({ steps: TEST_STEPS })
    service.stepAction('step-1', 'start')
    expect(() => service.stepAction('step-1', 'start')).toThrow(/cannot.*start/i)
  })

  test('out-of-order action on non-started step fails', () => {
    const { service } = freshService('out-of-order')
    service.init()
    service.seed({ steps: [TEST_STEPS[0]] })
    expect(() => service.stepAction('step-1', 'implemented')).toThrow(/cannot.*implemented/i)
  })
})
