import { Database } from 'bun:sqlite'
import { ErrorCodes, conflict, invalid, notFound } from '../../shared/errors'
import { requireNonEmpty, stepIdFor } from '../../shared/validation'
import {
  CountResult,
  StepRow,
  StepDef,
  MetaRow,
  STEP_STATUSES,
  StepStatus,
  ACTIVE_STEP_STATUSES,
  bulkInsertSteps,
  logWorklog,
} from '../database'
import { gatePlan, getStep } from '../workflow'

export type StepInput = {
  step_number?: string
  title?: string
  objective?: string
  context?: string
  test_suite_intent?: string
  implementation_plan_intent?: string
  validation?: string
  depends_on?: string | null
}

/** Resolve a `depends_on` reference to a canonical step ID.
 *
 * Accepts step numbers (`"1"`, `"1.2.3"`), step IDs (`"step-1"`),
 * dotted numbers (`"1.2.3"`), or null/`"start"` (returns null).
 * When a `knownSteps` map is provided, lookups are resolved against it first.
 * Throws `invalid` if the reference cannot be parsed. */
export function resolveDependency(
  dependsOn?: string | null,
  knownSteps?: Map<string, string>,
): string | null {
  const raw = String(dependsOn || '').trim()
  if (!raw || raw.toLowerCase().includes('start')) return null
  if (knownSteps?.has(raw)) return knownSteps.get(raw) || null
  if (raw.startsWith('step-')) return raw
  const m = raw.match(/^(\d+(?:\.\d+)*)$/)
  if (m) return stepIdFor(m[1])
  throw invalid(`depends_on '${raw}' could not be resolved`)
}

/** Import a batch of step definitions into an empty database.
 *
 * Validates uniqueness, self-dependency, and orphan dependency references.
 * Throws `invalid` for validation failures or `conflict` (`ALREADY_SEEDED`)
 * if the database already contains steps. */
export function importStepsBatch(
  db: Database,
  steps: StepInput[],
): { stepsCreated: number; steps: StepDef[] } {
  if (!steps || steps.length === 0) throw invalid('steps array is required')

  const existing = db.query('SELECT COUNT(*) as cnt FROM steps').get() as CountResult
  if (existing.cnt > 0) throw conflict(ErrorCodes.ALREADY_SEEDED, 'Database already has steps')

  const stepNumberToId = new Map<string, string>()
  const stepIds = new Set<string>()
  for (const step of steps) {
    const stepNumber = requireNonEmpty(step.step_number, 'step_number')
    const stepId = stepIdFor(stepNumber)
    if (stepNumberToId.has(stepNumber) || stepIds.has(stepId)) {
      throw conflict(ErrorCodes.DUPLICATE_STEP, `Duplicate step '${stepNumber}'`)
    }
    stepNumberToId.set(stepNumber, stepId)
    stepIds.add(stepId)
  }

  const defs: StepDef[] = steps.map((s, i) => {
    const stepNumber = requireNonEmpty(s.step_number, 'step_number')
    const stepId = stepIdFor(stepNumber)
    const dependsOnStepId = resolveDependency(s.depends_on, stepNumberToId)
    if (dependsOnStepId === stepId) throw invalid(`Step '${stepNumber}' cannot depend on itself`)
    if (dependsOnStepId && !stepIds.has(dependsOnStepId)) {
      throw invalid(`Dependency '${s.depends_on}' does not match any imported step`)
    }
    return {
      id: stepId,
      number: stepNumber,
      title: requireNonEmpty(s.title, 'title'),
      objective: requireNonEmpty(s.objective, 'objective'),
      context: s.context || '',
      testSuite: s.test_suite_intent || '',
      implementationPlan: s.implementation_plan_intent || '',
      validation: s.validation || 'quality gates',
      sortOrder: i,
      dependsOnStepId,
    }
  })

  bulkInsertSteps(db, defs)
  logWorklog(db, null, 'import-steps', { stepsCreated: defs.length })
  return { stepsCreated: defs.length, steps: defs }
}

/** Create a single step with auto-incrementing sort order.
 *
 * Validates required fields, duplicate step numbers, self-dependency,
 * and dependency existence in the database. */
export function createStep(db: Database, input: StepInput) {
  const stepNumber = requireNonEmpty(input.step_number, 'step_number')
  const title = requireNonEmpty(input.title, 'title')
  const objective = requireNonEmpty(input.objective, 'objective')
  const maxOrder = db
    .query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM steps')
    .get() as { next: number }
  const stepId = stepIdFor(stepNumber)
  const duplicate = db
    .query('SELECT id FROM steps WHERE id = ? OR step_number = ?')
    .get(stepId, stepNumber) as { id: string } | undefined
  if (duplicate) throw conflict(ErrorCodes.DUPLICATE_STEP, `Step '${stepNumber}' already exists`)
  const dependsOnStepId = resolveDependency(input.depends_on)
  if (dependsOnStepId === stepId) throw invalid(`Step '${stepNumber}' cannot depend on itself`)
  if (dependsOnStepId) {
    const parent = db.query('SELECT id FROM steps WHERE id = ?').get(dependsOnStepId) as
      | { id: string }
      | undefined
    if (!parent) throw notFound(`Dependency step '${dependsOnStepId}' not found`)
  }

  db.run(
    `INSERT INTO steps (id, step_number, title, objective, context, test_suite, implementation_plan, validation, sort_order, depends_on_step_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      stepId,
      stepNumber,
      title,
      objective,
      input.context || '',
      input.test_suite_intent || '',
      input.implementation_plan_intent || '',
      input.validation || 'quality gates',
      maxOrder.next,
      dependsOnStepId,
    ],
  )
  logWorklog(db, stepId, 'step-created', { step_number: stepNumber })
  return {
    id: stepId,
    step_number: stepNumber,
    title,
    objective,
    context: input.context || '',
    test_suite_intent: input.test_suite_intent || '',
    implementation_plan_intent: input.implementation_plan_intent || '',
    validation: input.validation || 'quality gates',
    depends_on: input.depends_on ?? null,
  }
}

/** Update one or more fields on an existing step.
 *
 * Only the fields present in `input` are updated. Validates status transitions,
 * self-dependency, and dependency existence. Throws `invalid` if no fields
 * are provided or validation fails, `notFound` if the step doesn't exist. */
export function updateStepFields(
  db: Database,
  id: string,
  input: Partial<StepInput & { status?: string; depends_on?: string | null }>,
) {
  getStep(db, id)
  const fields: string[] = []
  const values: (string | number | boolean | null)[] = []
  if (input.title !== undefined) {
    fields.push('title = ?')
    values.push(input.title)
  }
  if (input.objective !== undefined) {
    fields.push('objective = ?')
    values.push(input.objective)
  }
  if (input.context !== undefined) {
    fields.push('context = ?')
    values.push(input.context)
  }
  if (input.test_suite_intent !== undefined) {
    fields.push('test_suite = ?')
    values.push(input.test_suite_intent)
  }
  if (input.implementation_plan_intent !== undefined) {
    fields.push('implementation_plan = ?')
    values.push(input.implementation_plan_intent)
  }
  if (input.validation !== undefined) {
    fields.push('validation = ?')
    values.push(input.validation)
  }
  if (input.status !== undefined) {
    if (!STEP_STATUSES.includes(input.status as StepStatus))
      throw invalid(`Invalid status '${input.status}'`)
    fields.push('status = ?')
    values.push(input.status)
  }
  if (input.depends_on !== undefined) {
    const dependsOnStepId = resolveDependency(input.depends_on)
    if (dependsOnStepId === id) throw invalid('A step cannot depend on itself')
    if (dependsOnStepId) {
      const parent = db.query('SELECT id FROM steps WHERE id = ?').get(dependsOnStepId) as
        | { id: string }
        | undefined
      if (!parent) throw notFound(`Dependency step '${dependsOnStepId}' not found`)
      if (wouldCreateCycle(db, id, dependsOnStepId))
        throw invalid(
          `Setting dependency to '${dependsOnStepId}' would create a circular dependency`,
        )
    }
    fields.push('depends_on_step_id = ?')
    values.push(dependsOnStepId)
  }
  if (fields.length === 0) throw invalid('No fields to update')
  values.push(id)
  db.run(`UPDATE steps SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`, values)
  logWorklog(db, id, 'step-updated', { fields: fields.map((f) => f.split('=')[0].trim()) })
  return { id, updated: fields.map((f) => f.split('=')[0].trim()) }
}

/** Walk the dependency chain from `startId` and return true if it would reach `targetId`. */
function wouldCreateCycle(
  db: Database,
  targetId: string,
  startId: string | null,
): boolean {
  if (!startId) return false
  let current: string | null | undefined = startId
  const visited = new Set<string>()
  while (current) {
    if (current === targetId) return true
    if (visited.has(current)) return false
    visited.add(current)
    const row = db.query('SELECT depends_on_step_id FROM steps WHERE id = ?').get(current) as
      | { depends_on_step_id: string | null }
      | undefined
    if (!row) break
    current = row.depends_on_step_id
  }
  return false
}

/** Delete a step by ID. Blocks deletion if other steps depend on it. */
export function deleteStepById(db: Database, id: string) {
  getStep(db, id)
  const deps = db
    .query('SELECT COUNT(*) as cnt FROM steps WHERE depends_on_step_id = ?')
    .get(id) as CountResult
  if (deps.cnt > 0)
    throw conflict(
      ErrorCodes.BLOCKED,
      `Cannot delete '${id}': ${deps.cnt} step(s) depend on it`,
    )
  db.run('DELETE FROM steps WHERE id = ?', [id])
  logWorklog(db, null, 'step-deleted', { stepId: id })
  return { deleted: id }
}

export function getStepList(db: Database): { steps: StepRow[] } {
  return {
    steps: (db.query('SELECT * FROM steps ORDER BY sort_order').all() as StepRow[]).map(gatePlan),
  }
}

/** Aggregate project metadata, step list, current active step, and per-status counts. */
export function getProjectStatusData(db: Database): {
  meta: Record<string, string>
  steps: StepRow[]
  current: StepRow | null
  stats: {
    total: number
    completed: number
    inProgress: number
    scenariosGenerated: number
    designGenerated: number
    testsBuilt: number
    implemented: number
    pending: number
    failed: number
    skipped: number
  }
} {
  const meta: Record<string, string> = {}
  for (const row of db.query('SELECT key, value FROM meta').all() as MetaRow[])
    meta[row.key] = row.value

  const steps = (db.query('SELECT * FROM steps ORDER BY sort_order').all() as StepRow[]).map(
    gatePlan,
  )

  const activeParams = ACTIVE_STEP_STATUSES.map(() => '?').join(',')
  const current =
    db
      .query(
        `SELECT * FROM steps WHERE status IN (${activeParams}) ORDER BY sort_order LIMIT 1`,
      )
      .get(...ACTIVE_STEP_STATUSES) || null

  const stats = db
    .query(`SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
      COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as inProgress,
      COALESCE(SUM(CASE WHEN status = 'scenarios_generated' THEN 1 ELSE 0 END), 0) as scenariosGenerated,
      COALESCE(SUM(CASE WHEN status = 'design_generated' THEN 1 ELSE 0 END), 0) as designGenerated,
      COALESCE(SUM(CASE WHEN status = 'tests_built' THEN 1 ELSE 0 END), 0) as testsBuilt,
      COALESCE(SUM(CASE WHEN status = 'implemented' THEN 1 ELSE 0 END), 0) as implemented,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
      COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
      COALESCE(SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END), 0) as skipped
    FROM steps`)
    .get() as {
    total: number
    completed: number
    inProgress: number
    scenariosGenerated: number
    designGenerated: number
    testsBuilt: number
    implemented: number
    pending: number
    failed: number
    skipped: number
  }

  return { meta, steps, current: current ? gatePlan(current as StepRow) : null, stats }
}

/** Run integrity checks on the project: orphan dependencies, duplicate step
 * numbers, stuck steps, missing scenarios, and missing approved designs. */
export function validateProjectIntegrity(
  db: Database,
): { valid: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = []
  const warnings: string[] = []

  for (const row of db
    .query(
      `SELECT s.id, s.step_number FROM steps s
       WHERE s.depends_on_step_id IS NOT NULL AND s.depends_on_step_id NOT IN (SELECT id FROM steps)`,
    )
    .all() as { id: string; step_number: string }[]) {
    issues.push(
      `Orphan dependency: step '${row.id}' (${row.step_number}) points to a nonexistent step`,
    )
  }

  for (const row of db
    .query('SELECT step_number, COUNT(*) as cnt FROM steps GROUP BY step_number HAVING cnt > 1')
    .all() as { step_number: string; cnt: number }[]) {
    issues.push(`Duplicate step number '${row.step_number}' (${row.cnt} occurrences)`)
  }

  for (const row of db
    .query(
      "SELECT id, step_number FROM steps WHERE status = 'in_progress' AND updated_at < datetime('now', '-7 days')",
    )
    .all() as { id: string; step_number: string }[]) {
    warnings.push(
      `Stuck step: '${row.id}' (${row.step_number}) has been in_progress for > 7 days`,
    )
  }

  for (const row of db
    .query(
      `SELECT id, step_number FROM steps
       WHERE status IN ('scenarios_generated','design_generated','tests_built','implemented','completed')
         AND id NOT IN (SELECT DISTINCT step_id FROM test_scenarios)`,
    )
    .all() as { id: string; step_number: string }[]) {
    warnings.push(
      `Step '${row.id}' (${row.step_number}) is past scenario generation but has no tracked test scenarios`,
    )
  }

  for (const row of db
    .query(
      `SELECT s.id, s.step_number FROM steps s
       WHERE s.status IN ('design_generated','tests_built','implemented','completed')
         AND 2 > (
           SELECT COUNT(DISTINCT artifact_type) FROM design_artifacts d
           WHERE d.step_id = s.id AND d.status = 'approved' AND d.artifact_type IN ('hld','lld')
         )`,
    )
    .all() as { id: string; step_number: string }[]) {
    warnings.push(
      `Step '${row.id}' (${row.step_number}) is past design generation but lacks approved HLD and LLD`,
    )
  }

  return { valid: issues.length === 0, issues, warnings }
}

/** Apply a state transition to a step inside a transaction.
 * Note: does not validate that the current status matches `from`;
 * callers are responsible for pre-flight checks. */
export function applyStepTransition(
  db: Database,
  id: string,
  action: string,
  from: string,
  to: string,
): void {
  db.transaction(() => {
    db.run("UPDATE steps SET status = ?, updated_at = datetime('now') WHERE id = ?", [to, id])
    logWorklog(db, id, action, { from, to })
  })()
}

export function stepExists(db: Database, id: string): boolean {
  const row = db.query('SELECT id FROM steps WHERE id = ?').get(id) as { id: string } | undefined
  return !!row
}
