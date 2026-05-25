import { test as bunTest, afterAll } from 'bun:test'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'
import { generateReport } from './report'
import { getReportPath, results, recordPass, recordFail, C } from './helpers'

let _testNumber = 0
function trackedTest(name: string, fn: () => void): void {
  bunTest(name, () => {
    const start = performance.now()
    _testNumber++
    try {
      fn()
      recordPass()
      results.push({
        number: _testNumber,
        section: 'Service Integration',
        label: name,
        status: 'pass',
        timingMs: Math.round(performance.now() - start),
        request: null,
        response: null,
        errorMessage: null,
      })
    } catch (e) {
      recordFail()
      results.push({
        number: _testNumber,
        section: 'Service Integration',
        label: name,
        status: 'fail',
        timingMs: Math.round(performance.now() - start),
        request: null,
        response: null,
        errorMessage: (e as Error).message,
      })
      throw e
    }
  })
}

const { AutoProjectService } = await import('../service')
const { PROMPTS_PATH, BACKEND_DIR } = await import('../paths')

const _globalStart = performance.now()
let _reportPath = ''

function createIsolatedService(name: string) {
  const root = join(tmpdir(), name)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  const autoprojectDir = join(root, '.autoproject')
  return {
    root,
    autoprojectDir,
    service: new AutoProjectService({
      root,
      autoprojectDir,
      dbPath: join(autoprojectDir, 'autoproject.db'),
      promptsPath: PROMPTS_PATH,
      projectContextPath: join(root, 'PROJECT.md'),
      backendDir: BACKEND_DIR,
    }),
  }
}

const { service, root, autoprojectDir } = createIsolatedService('workflow-engine-integration-test')

trackedTest('init creates database and agent assets', () => {
  const result: Record<string, unknown> = service.init() as unknown as Record<string, unknown>
  if (result.message !== 'Database initialized') throw new Error('Init failed')
  if (!existsSync(join(autoprojectDir, 'AGENTS.md'))) throw new Error('AGENTS.md not created')
  if (!existsSync(join(autoprojectDir, 'mcp.json'))) throw new Error('mcp.json not created')
})

trackedTest('seed imports steps', () => {
  const result: Record<string, unknown> = service.seed({
    steps: [
      {
        step_number: '1',
        title: 'Setup',
        objective: 'Initialize project',
        validation: 'lint',
        depends_on: null,
      },
      {
        step_number: '2',
        title: 'Build',
        objective: 'Build core logic',
        validation: 'typecheck',
        depends_on: '1',
      },
      {
        step_number: '3',
        title: 'Test',
        objective: 'Add tests',
        validation: 'test',
        depends_on: '2',
      },
    ],
  }) as unknown as Record<string, unknown>
  if (result.stepsCreated !== 3) throw new Error(`Expected 3 steps, got ${result.stepsCreated}`)
})

trackedTest('seed returns conflict when already seeded', () => {
  try {
    service.seed({ steps: [{ step_number: '99', title: 'Extra', objective: 'Should fail' }] })
    throw new Error('Expected conflict error')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code !== 'ALREADY_SEEDED') throw new Error(`Expected ALREADY_SEEDED, got ${err.code}`)
  }
})

trackedTest('projectStatus returns full state', () => {
  const status: Record<string, unknown> = service.projectStatus() as unknown as Record<
    string,
    unknown
  >
  const steps = status.steps as unknown[]
  const stats = status.stats as unknown as Record<string, unknown>
  if (steps.length !== 3) throw new Error('Expected 3 steps')
  if (!status.meta) throw new Error('meta missing')
  if (stats.total !== 3) throw new Error(`Expected total 3, got ${stats.total}`)
  if (status.current !== null) throw new Error('No active current step is expected before start')
})

trackedTest('validateProject returns valid results', () => {
  const result: Record<string, unknown> = service.validateProject() as unknown as Record<
    string,
    unknown
  >
  if (typeof result.valid !== 'boolean') throw new Error('valid must be boolean')
  if (!Array.isArray(result.issues)) throw new Error('issues must be array')
  if (!Array.isArray(result.warnings)) throw new Error('warnings must be array')
})

trackedTest('listSteps returns ordered steps', () => {
  const { steps } = service.listSteps()
  if (steps.length !== 3) throw new Error('Expected 3 steps')
  if (steps[0].step_number !== '1') throw new Error('Step 1 should be first')
  if (steps[0].status !== 'pending') throw new Error('Step 1 should be pending')
})

trackedTest('currentStep returns first eligible step', () => {
  const step: Record<string, unknown> = service.currentStep() as unknown as Record<string, unknown>
  if (step.step_number !== '1') throw new Error('Expected step 1')
})

trackedTest('getStep returns specific step', () => {
  const step: Record<string, unknown> = service.getStep('step-1') as unknown as Record<
    string,
    unknown
  >
  if (step.id !== 'step-1') throw new Error('Expected step-1')
  if (step.title !== 'Setup') throw new Error('Expected title Setup')
})

trackedTest('stepAction: start transitions pending to in_progress', () => {
  const result: Record<string, unknown> = service.stepAction(
    'step-1',
    'start',
  ) as unknown as Record<string, unknown>
  if (result.to !== 'in_progress') throw new Error(`Expected in_progress, got ${result.to}`)
})

trackedTest('stepAction: start on active step returns conflict', () => {
  try {
    service.stepAction('step-2', 'start')
    throw new Error('Expected conflict')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (!err.code?.includes('ACTIVE')) throw new Error(`Expected ACTIVE error, got ${err.code}`)
  }
})

trackedTest('stepAction: invalid action returns error', () => {
  try {
    service.stepAction('step-1', 'invalid-action')
    throw new Error('Expected error')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code !== 'INVALID') throw new Error(`Expected INVALID, got ${err.code}`)
  }
})

trackedTest('addRequirement creates requirement', () => {
  const req: Record<string, unknown> = service.addRequirement({
    body: 'Build a robust system',
    source: 'product',
  }) as unknown as Record<string, unknown>
  if (!(req.id as string).startsWith('req-')) throw new Error('Expected req- prefix')
  if (req.source !== 'product') throw new Error(`Expected product, got ${req.source}`)
})

trackedTest('listRequirements returns requirements', () => {
  const { requirements } = service.listRequirements()
  if (requirements.length === 0) throw new Error('Expected at least 1 requirement')
})

trackedTest('addRequirement with empty body fails', () => {
  try {
    service.addRequirement({ body: '' })
    throw new Error('Expected error')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code !== 'INVALID') throw new Error(`Expected INVALID, got ${err.code}`)
  }
})

trackedTest('listPrompts returns prompt list', () => {
  const result: Record<string, unknown> = service.listPrompts() as unknown as Record<
    string,
    unknown
  >
  const prompts = result.prompts as unknown[]
  if (result.version !== 3) throw new Error(`Expected version 3, got ${result.version}`)
  if (prompts.length < 3) throw new Error('Expected at least 3 prompts')
})

trackedTest('renderPrompt renders step-generation', () => {
  const result: Record<string, unknown> = service.renderPrompt('step-generation', {
    context: 'Build a login system with OAuth2',
  }) as unknown as Record<string, unknown>
  if (!(result.runId as string).startsWith('pr-')) throw new Error('Expected pr- prefix')
  if (result.promptKey !== 'step-generation') throw new Error('Expected step-generation')
  const messages = result.messages as unknown[]
  if (messages.length !== 2) throw new Error('Expected 2 messages')
})

trackedTest('renderPrompt renders test-scenarios with stepId', () => {
  const result: Record<string, unknown> = service.renderPrompt('test-scenarios', {
    stepId: 'step-1',
  }) as unknown as Record<string, unknown>
  if (result.promptKey !== 'test-scenarios') throw new Error('Expected test-scenarios')
})

trackedTest('completePrompt marks run completed', () => {
  const render: Record<string, unknown> = service.renderPrompt('step-generation', {
    context: 'test',
  }) as unknown as Record<string, unknown>
  const result: Record<string, unknown> = service.completePrompt(render.runId as string, {
    status: 'completed',
    outputRef: 'test-output',
  }) as unknown as Record<string, unknown>
  if (result.status !== 'completed') throw new Error('Expected completed')
  if (result.outputRef !== 'test-output') throw new Error('Expected test-output')
})

trackedTest('createStep creates a new step', () => {
  const step: Record<string, unknown> = service.createStep({
    step_number: '4',
    title: 'Deploy',
    objective: 'Deploy to production',
    context: 'After testing',
  }) as unknown as Record<string, unknown>
  if (step.id !== 'step-4') throw new Error('Expected step-4')
  if (step.title !== 'Deploy') throw new Error('Expected Deploy')
})

trackedTest('createStep rejects duplicate', () => {
  try {
    service.createStep({ step_number: '4', title: 'Duplicate', objective: 'Should fail' })
    throw new Error('Expected error')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code !== 'DUPLICATE_STEP') throw new Error(`Expected DUPLICATE_STEP, got ${err.code}`)
  }
})

trackedTest('updateStep updates step fields', () => {
  const result: Record<string, unknown> = service.updateStep('step-4', {
    title: 'Deploy to Cloud',
    context: 'Updated',
  }) as unknown as Record<string, unknown>
  const updated = result.updated as string[]
  if (!updated.includes('title')) throw new Error('Expected title in updated fields')
  const step: Record<string, unknown> = service.getStep('step-4') as unknown as Record<
    string,
    unknown
  >
  if (step.title !== 'Deploy to Cloud') throw new Error('Expected updated title')
})

trackedTest('updateStep with invalid status fails', () => {
  try {
    service.updateStep('step-4', { status: 'bogus' as never })
    throw new Error('Expected error')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code !== 'INVALID') throw new Error(`Expected INVALID, got ${err.code}`)
  }
})

trackedTest('deleteStep removes a step', () => {
  const result: Record<string, unknown> = service.deleteStep('step-4') as unknown as Record<
    string,
    unknown
  >
  if (result.deleted !== 'step-4') throw new Error('Expected step-4')
  try {
    service.getStep('step-4')
    throw new Error('Expected NOT_FOUND')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code !== 'NOT_FOUND') throw new Error(`Expected NOT_FOUND, got ${err.code}`)
  }
})

trackedTest('importScenarios imports scenarios for a step', () => {
  const result: Record<string, unknown> = service.importScenarios('step-1', {
    scenarios: [
      { title: 'Login works', expected_result: 'User logs in', priority: 'critical' },
      { title: 'Logout works', expected_result: 'User logs out', priority: 'high' },
    ],
  }) as unknown as Record<string, unknown>
  if (result.imported !== 2) throw new Error(`Expected 2, got ${result.imported}`)
})

trackedTest('listScenarios returns scenarios', () => {
  const step1 = service.listScenarios('step-1')
  const scenarios = step1.scenarios as unknown[]
  if (scenarios.length < 2) throw new Error('Expected at least 2 scenarios')
})

trackedTest('updateScenarioStatus updates scenario', () => {
  const step1 = service.listScenarios('step-1')
  const scenarios = step1.scenarios as { id: string }[]
  const result: Record<string, unknown> = service.updateScenarioStatus(scenarios[0].id, {
    status: 'automated',
  }) as unknown as Record<string, unknown>
  if (result.status !== 'automated') throw new Error('Expected automated')
})

trackedTest('updateScenarioStatus rejects invalid status', () => {
  try {
    service.updateScenarioStatus('sc-nonexistent', { status: 'invalid' })
    throw new Error('Expected error')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code !== 'INVALID') throw new Error(`Expected INVALID, got ${err.code}`)
  }
})

trackedTest('importDesign imports HLD and LLD', () => {
  const result: Record<string, unknown> = service.importDesign('step-1', {
    hld: {
      summary: 'HLD',
      architecture: ['comp1'] as string[],
      data_flow: [] as string[],
      integration_points: [] as string[],
      risks: [] as string[],
    },
    lld: {
      files: ['file.ts'] as string[],
      data_model: [] as string[],
      algorithms: [] as string[],
      implementation_order: [] as string[],
      scenario_mapping: [] as string[],
    },
  }) as unknown as Record<string, unknown>
  const imported = result.imported as string[]
  if (imported.length !== 2) throw new Error('Expected 2 artifacts')
})

trackedTest('getDesign returns design artifacts', () => {
  const design = service.getDesign('step-1')
  if (design.artifacts.length < 2) throw new Error('Expected at least 2 artifacts')
})

trackedTest('createTestSuite creates a test suite', () => {
  const result: Record<string, unknown> = service.createTestSuite('step-1', {
    name: 'Core Tests',
  }) as unknown as Record<string, unknown>
  if (!(result.id as string).startsWith('ts-')) throw new Error('Expected ts- prefix')
  if (result.name !== 'Core Tests') throw new Error('Expected Core Tests')
})

trackedTest('testSuiteStatus lists all suites', () => {
  const result: Record<string, unknown> = service.testSuiteStatus() as unknown as Record<
    string,
    unknown
  >
  const suites = result.suites as unknown[]
  if (suites.length < 1) throw new Error('Expected at least 1 suite')
})

trackedTest('updateProjectContext writes context', () => {
  const result: Record<string, unknown> = service.updateProjectContext(
    '# My Project\n\nContext content',
  ) as unknown as Record<string, unknown>
  if (result.updated !== true) throw new Error('Expected updated true')
  const ctx = service.getProjectContext()
  if (!ctx.content.includes('My Project')) throw new Error('Expected My Project in context')
})

trackedTest('getProjectContext returns current context', () => {
  const ctx = service.getProjectContext()
  if (typeof ctx.exists !== 'boolean') throw new Error('exists must be boolean')
  if (typeof ctx.content !== 'string') throw new Error('content must be string')
})

trackedTest('worklog returns entries', () => {
  const { entries } = service.worklog()
  if (entries.length === 0) throw new Error('Expected at least 1 worklog entry')
})

trackedTest('worklog filters by stepId', () => {
  const { entries } = service.worklog('step-1')
  for (const entry of entries) {
    const e = entry as { step_id: string }
    if (e.step_id !== 'step-1') throw new Error('Expected step-1 entries')
  }
})

trackedTest('qualityGateStatus returns runs', () => {
  const result: Record<string, unknown> = service.qualityGateStatus() as unknown as Record<
    string,
    unknown
  >
  const runs = result.runs as unknown[]
  if (!Array.isArray(runs)) throw new Error('runs must be array')
})

trackedTest('onboard returns conflict when already initialized', () => {
  try {
    service.onboard({ requirements: 'New project', projectContext: '# New' })
    throw new Error('Expected conflict')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code !== 'ALREADY_INITIALIZED')
      throw new Error(`Expected ALREADY_INITIALIZED, got ${err.code}`)
  }
})

afterAll(() => {
  _reportPath = getReportPath()
  generateReport(_globalStart, _reportPath)

  const dbPath = join(autoprojectDir, 'autoproject.db')
  try {
    if (existsSync(dbPath)) {
      const db = new Database(dbPath)
      db.close()
      rmSync(root, { recursive: true, force: true })
      console.log(`  ${'\x1b[0;32m'}✓${'\x1b[0m'} Cleaned up test directory: ${root}`)
    }
  } catch {
    // best-effort cleanup
  }

  console.log()
  console.log(`  ${'\x1b[1;33m'}Open in browser to explore:${'\x1b[0m'}`)
  console.log(`    ${'\x1b[0;36m'}${_reportPath}${'\x1b[0m'}`)
})
