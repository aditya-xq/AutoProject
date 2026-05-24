import { Database } from 'bun:sqlite'
import { ErrorCodes, conflict, invalid, notFound } from '../shared/errors'
import { ACTIVE_STEP_STATUSES, CountResult, StepRow, StepStatus } from './database'

export { ACTIVE_STEP_STATUSES }

const ACTIVE_PLACEHOLDERS = ACTIVE_STEP_STATUSES.map(() => '?').join(',')

export const TRANSITIONS: Record<StepStatus, Partial<Record<string, StepStatus>>> = {
  pending: { start: 'in_progress', skip: 'skipped' },
  in_progress: { 'scenarios-generated': 'scenarios_generated', fail: 'failed' },
  scenarios_generated: { 'design-generated': 'design_generated', fail: 'failed' },
  design_generated: { 'tests-built': 'tests_built', fail: 'failed' },
  tests_built: { implemented: 'implemented', fail: 'failed' },
  implemented: { complete: 'completed', fail: 'failed' },
  failed: { retry: 'in_progress', skip: 'skipped' },
  completed: {},
  skipped: {},
}

export const REQUIRED_QUALITY_GATES = ['lint', 'typecheck', 'test', 'build'] as const
export type QualityGate = (typeof REQUIRED_QUALITY_GATES)[number]

export const PLAN_VISIBLE_STATUSES: ReadonlySet<StepStatus> = new Set<StepStatus>([
  'tests_built',
  'implemented',
  'completed',
])

/** Validate an action is legal from the step's current status per the state machine. */
export function validateTransition(step: StepRow, action: string): StepStatus {
  const transitionMap = TRANSITIONS[step.status]
  if (!transitionMap?.[action]) {
    const valid = Object.keys(transitionMap || {}).join(', ') || '(none)'
    throw invalid(`Cannot '${action}' from '${step.status}'. Valid: ${valid}`)
  }
  return transitionMap[action] as StepStatus
}

/**
 * Return a copy of the step with `implementation_plan` redacted
 * unless the step has progressed far enough ({@link PLAN_VISIBLE_STATUSES}).
 * The original row is never mutated.
 */
export function gatePlan(step: StepRow): StepRow {
  if (PLAN_VISIBLE_STATUSES.has(step.status as StepStatus)) return step
  return { ...step, implementation_plan: '' }
}

/**
 * Assert the step can be started.
 * Checks no other step is active, the step exists, and it is the next eligible
 * pending step (dependencies satisfied, smallest `sort_order`).
 */
export function assertCanStart(db: Database, id: string): void {
  const total = db.query('SELECT COUNT(*) as cnt FROM steps').get() as CountResult
  if (total.cnt === 0)
    throw invalid('No steps in database. Seed or import steps before starting any.')

  const active = db
    .query(`SELECT id FROM steps WHERE status IN (${ACTIVE_PLACEHOLDERS}) ORDER BY sort_order LIMIT 1`)
    .get(...ACTIVE_STEP_STATUSES) as { id: string } | undefined
  if (active)
    throw conflict(ErrorCodes.ACTIVE_STEP, `Cannot start '${id}'. Active step is '${active.id}'.`)

  const current = db
    .query(
      `SELECT id FROM steps
       WHERE status = 'pending'
         AND (depends_on_step_id IS NULL OR depends_on_step_id IN (SELECT id FROM steps WHERE status = 'completed'))
       ORDER BY sort_order LIMIT 1`,
    )
    .get() as { id: string } | undefined
  if (!current)
    throw conflict(ErrorCodes.BLOCKED, 'No eligible pending step. Dependencies may be blocking.')
  if (current.id !== id)
    throw conflict(ErrorCodes.WRONG_STEP, `Cannot start '${id}'. Current step is '${current.id}'.`)
}

/** Assert at least one test scenario exists for the step before advancing past scenario generation. */
export function assertScenarioReady(db: Database, id: string): void {
  const scenarios = db
    .query('SELECT COUNT(*) as cnt FROM test_scenarios WHERE step_id = ?')
    .get(id) as CountResult
  if (scenarios.cnt === 0)
    throw conflict(
      ErrorCodes.NO_SCENARIOS,
      'Import generated test scenarios before marking scenarios generated',
    )
}

/**
 * Assert the step has both approved HLD and approved LLD design artifacts
 * before advancing past design generation.
 */
export function assertDesignReady(db: Database, id: string): void {
  const designs = db
    .query("SELECT artifact_type FROM design_artifacts WHERE step_id = ? AND status = 'approved'")
    .all(id) as { artifact_type: string }[]
  const types = new Set(designs.map((d) => d.artifact_type))
  if (!types.has('hld') || !types.has('lld'))
    throw conflict(
      ErrorCodes.NO_DESIGN,
      'Import approved HLD and LLD before marking design generated',
    )
}

/**
 * Assert the step has at least one test suite and no scenarios remain in
 * `proposed` status before advancing past tests-built.
 */
export function assertTestsReady(db: Database, id: string): void {
  const suites = db
    .query('SELECT COUNT(*) as cnt FROM test_suites WHERE step_id = ?')
    .get(id) as CountResult
  if (suites.cnt === 0)
    throw conflict(
      ErrorCodes.NO_TEST_SUITES,
      'Create at least one test suite before marking tests built',
    )

  const proposed = db
    .query("SELECT COUNT(*) as cnt FROM test_scenarios WHERE step_id = ? AND status = 'proposed'")
    .get(id) as CountResult
  if (proposed.cnt > 0)
    throw conflict(
      ErrorCodes.UNAUTOMATED_SCENARIOS,
      'Mark generated scenarios automated, passing, failing, or deferred before marking tests built',
    )
}

/**
 * Assert a worklog entry exists for the given step and action.
 * Uses `message` as the error detail when the entry is missing.
 */
export function assertHasWorklog(db: Database, id: string, action: string, message: string): void {
  const count = db
    .query('SELECT COUNT(*) as cnt FROM worklog WHERE step_id = ? AND action = ?')
    .get(id, action) as CountResult
  if (count.cnt === 0) throw conflict(ErrorCodes.MISSING_WORKLOG, message)
}

/**
 * Assert the step is ready to be marked complete.
 * Requires an `implemented` worklog entry and a passing result for every
 * quality gate in {@link REQUIRED_QUALITY_GATES}.
 */
export function assertCanComplete(db: Database, id: string): void {
  assertHasWorklog(db, id, 'implemented', 'Must implement before completing')
  for (const gate of REQUIRED_QUALITY_GATES) {
    const latest = db
      .query(
        `SELECT status FROM quality_gate_runs
         WHERE step_id = ? AND gate_name = ?
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(id, gate) as { status: string } | undefined
    if (!latest)
      throw conflict(
        ErrorCodes.NO_QUALITY_GATES,
        'Run all quality gates before completing the step',
      )
    if (latest.status !== 'pass')
      throw conflict(
        ErrorCodes.QUALITY_GATES_FAILED,
        'Cannot complete while latest quality gate results include failures',
      )
  }
}

/** Return the first active step (non-terminal, ordered by sort_order), or `null` if none. */
export function getCurrentStep(db: Database): StepRow | null {
  return db
    .query(`SELECT * FROM steps WHERE status IN (${ACTIVE_PLACEHOLDERS}) ORDER BY sort_order LIMIT 1`)
    .get(...ACTIVE_STEP_STATUSES) as StepRow | null
}

/** Return the first pending step whose dependencies are satisfied, or `null` if none. */
export function getNextPendingStep(db: Database): StepRow | null {
  return db
    .query(
      `SELECT * FROM steps
       WHERE status = 'pending'
         AND (depends_on_step_id IS NULL OR depends_on_step_id IN (SELECT id FROM steps WHERE status = 'completed'))
       ORDER BY sort_order LIMIT 1`,
    )
    .get() as StepRow | null
}

/** Fetch a step by ID. Throws `notFound` if it does not exist. */
export function getStep(db: Database, id: string): StepRow {
  const step = db.query('SELECT * FROM steps WHERE id = ?').get(id) as StepRow | undefined
  if (!step) throw notFound(`Step '${id}' not found`)
  return step
}
