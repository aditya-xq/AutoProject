import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initializeDatabase } from '../../database'
import {
  resolveDependency,
  importStepsBatch,
  createStep,
  updateStepFields,
  deleteStepById,
  getStepList,
  getProjectStatusData,
  validateProjectIntegrity,
  applyStepTransition,
  stepExists,
} from '../step-repo'

function createDb(): Database {
  const db = new Database(':memory:')
  initializeDatabase(db)
  return db
}

function seedStep(db: Database, id: string, overrides?: Partial<{ status: string; sortOrder: number; dependsOn: string | null }>) {
  const sn = id.replace(/^step-/, '').replace(/-/g, '.')
  db.run(
    `INSERT INTO steps (id, step_number, title, objective, sort_order, status${overrides?.dependsOn !== undefined ? ', depends_on_step_id' : ''})
     VALUES (?, ?, 'Test', 'Objective', ?, ?${overrides?.dependsOn !== undefined ? ', ?' : ''})`,
    overrides?.dependsOn !== undefined
      ? [id, sn, overrides?.sortOrder ?? 0, overrides?.status ?? 'pending', overrides.dependsOn]
      : [id, sn, overrides?.sortOrder ?? 0, overrides?.status ?? 'pending'],
  )
}

function countSteps(db: Database): number {
  return (db.query('SELECT COUNT(*) as cnt FROM steps').get() as { cnt: number }).cnt
}

const VALID_INPUTS = [
  { step_number: '1', title: 'Setup', objective: 'Initialize', depends_on: null },
  { step_number: '2', title: 'Core', objective: 'Implement core', depends_on: '1' },
  { step_number: '3', title: 'API', objective: 'Build API', depends_on: '2' },
]

describe('resolveDependency', () => {
  test('returns null for empty or start-like values', () => {
    expect(resolveDependency('')).toBeNull()
    expect(resolveDependency('start')).toBeNull()
    expect(resolveDependency('START')).toBeNull()
  })

  test('resolves from knownSteps map by step_number', () => {
    const map = new Map([['1', 'step-1'], ['2', 'step-2']])
    expect(resolveDependency('1', map)).toBe('step-1')
  })

  test('resolves from knownSteps map by step id value', () => {
    const map = new Map([['1', 'step-1']])
    expect(resolveDependency('step-1', map)).toBe('step-1')
  })

  test('passes through step- prefixed ids', () => {
    expect(resolveDependency('step-42')).toBe('step-42')
  })

  test('resolves dotted step numbers', () => {
    expect(resolveDependency('1.2.3')).toBe('step-1-2-3')
  })

  test('throws for unresolvable dependency', () => {
    expect(() => resolveDependency('nonexistent')).toThrow(/could not be resolved/)
  })

  test('throws for embedded digits (requires exact match)', () => {
    expect(() => resolveDependency('abc123')).toThrow(/could not be resolved/)
    expect(() => resolveDependency('1.2.3extra')).toThrow(/could not be resolved/)
  })
})

describe('importStepsBatch', () => {
  test('imports multiple steps with pending status', () => {
    const db = createDb()
    const result = importStepsBatch(db, VALID_INPUTS)
    expect(result.stepsCreated).toBe(3)
    expect(countSteps(db)).toBe(3)
  })

  test('returns StepDef array with correct ids', () => {
    const db = createDb()
    const result = importStepsBatch(db, [VALID_INPUTS[0]])
    expect(result.steps[0].id).toBe('step-1')
    expect(result.steps[0].title).toBe('Setup')
  })

  test('throws when already seeded', () => {
    const db = createDb()
    importStepsBatch(db, [VALID_INPUTS[0]])
    expect(() => importStepsBatch(db, [VALID_INPUTS[1]])).toThrow(/already has steps/)
  })

  test('throws on duplicate step numbers within input', () => {
    const db = createDb()
    expect(() => importStepsBatch(db, [VALID_INPUTS[0], VALID_INPUTS[0]])).toThrow(/Duplicate step/)
  })

  test('throws on empty steps array', () => {
    const db = createDb()
    expect(() => importStepsBatch(db, [])).toThrow(/steps array is required/)
  })

  test('throws when step depends on itself', () => {
    const db = createDb()
    expect(() =>
      importStepsBatch(db, [{ step_number: '1', title: 'Self', objective: 'Bad', depends_on: '1' }]),
    ).toThrow(/cannot depend on itself/)
  })

  test('throws when dependency does not match any imported step', () => {
    const db = createDb()
    expect(() =>
      importStepsBatch(db, [
        { step_number: '1', title: 'A', objective: 'A' },
        { step_number: '2', title: 'B', objective: 'B', depends_on: '99' },
      ]),
    ).toThrow(/does not match any imported step/)
  })
})

describe('createStep', () => {
  test('creates a single step with auto-increment sort_order', () => {
    const db = createDb()
    const result = createStep(db, VALID_INPUTS[0])
    expect(result.id).toBe('step-1')
    expect(countSteps(db)).toBe(1)
  })

  test('returns default values matching DB for optional fields', () => {
    const db = createDb()
    const result = createStep(db, { step_number: '1', title: 'T', objective: 'O' })
    expect(result.context).toBe('')
    expect(result.test_suite_intent).toBe('')
    expect(result.implementation_plan_intent).toBe('')
    expect(result.validation).toBe('quality gates')
    expect(result.depends_on).toBeNull()
    const row = db.query('SELECT context, test_suite, implementation_plan, validation, depends_on_step_id FROM steps WHERE id = ?').get('step-1') as any
    expect(row.context).toBe('')
    expect(row.test_suite).toBe('')
    expect(row.implementation_plan).toBe('')
    expect(row.validation).toBe('quality gates')
    expect(row.depends_on_step_id).toBeNull()
  })

  test('creates step with incremented sort_order when steps exist', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    const result = createStep(db, VALID_INPUTS[1])
    expect(result.id).toBe('step-2')
    const [s1, s2] = db.query('SELECT sort_order FROM steps ORDER BY sort_order').all() as { sort_order: number }[]
    expect(s2.sort_order).toBeGreaterThan(s1.sort_order)
  })

  test('throws on duplicate step_number', () => {
    const db = createDb()
    createStep(db, VALID_INPUTS[0])
    expect(() => createStep(db, { ...VALID_INPUTS[0], title: 'Duplicate' })).toThrow(/already exists/)
  })

  test('throws when depending on self', () => {
    const db = createDb()
    expect(() => createStep(db, { ...VALID_INPUTS[0], depends_on: '1' })).toThrow(/cannot depend on itself/)
  })

  test('throws when dependency does not exist', () => {
    const db = createDb()
    expect(() => createStep(db, { step_number: '1', title: 'T', objective: 'O', depends_on: 'step-99' })).toThrow(
      /Dependency step.*not found/,
    )
  })

  test('requires step_number, title, objective', () => {
    const db = createDb()
    expect(() => createStep(db, { title: 'T', objective: 'O' })).toThrow()
    expect(() => createStep(db, { step_number: '1', objective: 'O' })).toThrow()
    expect(() => createStep(db, { step_number: '1', title: 'T' })).toThrow()
  })
})

describe('updateStepFields', () => {
  test('updates title and context', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    const result = updateStepFields(db, 'step-1', { title: 'New Title', context: 'New context' })
    expect(result.updated).toContain('title')
    expect(result.updated).toContain('context')
    const step = db.query('SELECT title, context FROM steps WHERE id = ?').get('step-1') as { title: string; context: string }
    expect(step.title).toBe('New Title')
    expect(step.context).toBe('New context')
  })

  test('updates depends_on to existing step', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    const result = updateStepFields(db, 'step-2', { depends_on: '1' })
    expect(result.updated).toContain('depends_on_step_id')
    const step = db.query('SELECT depends_on_step_id FROM steps WHERE id = ?').get('step-2') as { depends_on_step_id: string | null }
    expect(step.depends_on_step_id).toBe('step-1')
  })

  test('validates status field', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => updateStepFields(db, 'step-1', { status: 'bogus' as any })).toThrow(/Invalid status/)
  })

  test('updates status to valid value', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    updateStepFields(db, 'step-1', { status: 'in_progress' })
    const step = db.query('SELECT status FROM steps WHERE id = ?').get('step-1') as { status: string }
    expect(step.status).toBe('in_progress')
  })

  test('throws when step not found', () => {
    const db = createDb()
    expect(() => updateStepFields(db, 'nonexistent', { title: 'X' })).toThrow(/not found/)
  })

  test('throws when no fields to update', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => updateStepFields(db, 'step-1', {})).toThrow(/No fields/)
  })

  test('throws when step depends on self', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => updateStepFields(db, 'step-1', { depends_on: '1' })).toThrow(/cannot depend on itself/)
  })

  test('throws when dependency step does not exist', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => updateStepFields(db, 'step-1', { depends_on: '999' })).toThrow(/not found/)
  })

  test('can clear depends_on to null', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2', { dependsOn: 'step-1' })
    const result = updateStepFields(db, 'step-2', { depends_on: null })
    expect(result.updated).toContain('depends_on_step_id')
    const step = db.query('SELECT depends_on_step_id FROM steps WHERE id = ?').get('step-2') as { depends_on_step_id: string | null }
    expect(step.depends_on_step_id).toBeNull()
  })

  test('throws on circular dependency', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2', { dependsOn: 'step-1' })
    seedStep(db, 'step-3', { dependsOn: 'step-2' })
    expect(() =>
      updateStepFields(db, 'step-1', { depends_on: '3' }),
    ).toThrow(/circular dependency/i)
  })
})

describe('deleteStepById', () => {
  test('deletes an existing step', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    const result = deleteStepById(db, 'step-1')
    expect(result.deleted).toBe('step-1')
    expect(countSteps(db)).toBe(0)
  })

  test('throws when step not found', () => {
    const db = createDb()
    expect(() => deleteStepById(db, 'nonexistent')).toThrow(/not found/)
  })

  test('throws when other steps depend on it', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2', { dependsOn: 'step-1' })
    expect(() => deleteStepById(db, 'step-1')).toThrow(/depend on it/)
  })
})

describe('getStepList', () => {
  test('returns empty array when no steps exist', () => {
    const db = createDb()
    const { steps } = getStepList(db)
    expect(steps).toEqual([])
  })

  test('returns steps sorted by sort_order', () => {
    const db = createDb()
    seedStep(db, 'step-2', { sortOrder: 1 })
    seedStep(db, 'step-1', { sortOrder: 0 })
    const { steps } = getStepList(db)
    expect(steps[0].step_number).toBe('1')
    expect(steps[1].step_number).toBe('2')
  })

  test('redacts implementation_plan for early statuses', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order, status, implementation_plan) VALUES ('step-1', '1', 'T', 'O', 0, 'pending', 'secret')",
    )
    const { steps } = getStepList(db)
    expect(steps[0].implementation_plan).toBe('')
  })

  test('shows implementation_plan for tests_built and beyond', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order, status, implementation_plan) VALUES ('step-1', '1', 'T', 'O', 0, 'tests_built', 'visible')",
    )
    const { steps } = getStepList(db)
    expect(steps[0].implementation_plan).toBe('visible')
  })
})

describe('getProjectStatusData', () => {
  test('returns empty state with no steps', () => {
    const db = createDb()
    const result = getProjectStatusData(db)
    expect(result.steps).toEqual([])
    expect(result.current).toBeNull()
    expect(result.stats.total).toBe(0)
    expect(result.meta).toEqual({})
  })

  test('returns current step as first active step', () => {
    const db = createDb()
    seedStep(db, 'step-1', { status: 'in_progress' })
    seedStep(db, 'step-2', { status: 'pending' })
    seedStep(db, 'step-3', { status: 'in_progress' })
    const result = getProjectStatusData(db)
    expect(result.current).not.toBeNull()
    expect(result.current!.id).toBe('step-1')
    expect(result.current!.step_number).toBe('1')
    expect(result.current!.status).toBe('in_progress')
  })

  test('returns current with full StepRow shape', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, context, test_suite, implementation_plan, validation, status, sort_order) VALUES ('step-1', '1', 'T', 'O', 'ctx', 'ts', 'ip', 'vg', 'in_progress', 0)",
    )
    const result = getProjectStatusData(db)
    expect(result.current).toHaveProperty('id')
    expect(result.current).toHaveProperty('step_number')
    expect(result.current).toHaveProperty('title')
    expect(result.current).toHaveProperty('objective')
    expect(result.current).toHaveProperty('context')
    expect(result.current).toHaveProperty('test_suite')
    expect(result.current).toHaveProperty('implementation_plan')
    expect(result.current).toHaveProperty('validation')
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('sort_order')
    expect(result.current).toHaveProperty('depends_on_step_id')
    expect(result.current).toHaveProperty('created_at')
    expect(result.current).toHaveProperty('updated_at')
  })

  test('computes correct stats for all statuses', () => {
    const db = createDb()
    seedStep(db, 'step-1', { status: 'completed' })
    seedStep(db, 'step-2', { status: 'in_progress' })
    seedStep(db, 'step-3', { status: 'scenarios_generated' })
    seedStep(db, 'step-4', { status: 'design_generated' })
    seedStep(db, 'step-5', { status: 'tests_built' })
    seedStep(db, 'step-6', { status: 'implemented' })
    seedStep(db, 'step-7', { status: 'pending' })
    seedStep(db, 'step-8', { status: 'failed' })
    seedStep(db, 'step-9', { status: 'skipped' })
    const result = getProjectStatusData(db)
    expect(result.stats.total).toBe(9)
    expect(result.stats.completed).toBe(1)
    expect(result.stats.inProgress).toBe(1)
    expect(result.stats.scenariosGenerated).toBe(1)
    expect(result.stats.designGenerated).toBe(1)
    expect(result.stats.testsBuilt).toBe(1)
    expect(result.stats.implemented).toBe(1)
    expect(result.stats.pending).toBe(1)
    expect(result.stats.failed).toBe(1)
    expect(result.stats.skipped).toBe(1)
  })
})

describe('validateProjectIntegrity', () => {
  test('returns valid for clean project', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    const result = validateProjectIntegrity(db)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  test('detects orphan dependencies', () => {
    const db = createDb()
    db.run('PRAGMA foreign_keys = OFF')
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order, depends_on_step_id) VALUES ('step-2', '2', 'T', 'O', 0, 'step-99')",
    )
    db.run('PRAGMA foreign_keys = ON')
    const result = validateProjectIntegrity(db)
    expect(result.issues.some((i) => /orphan dependency/i.test(i))).toBe(true)
  })

  test('detects duplicate step numbers', () => {
    const db = createDb()
    db.run('DROP INDEX IF EXISTS idx_steps_step_number_unique')
    db.run("INSERT INTO steps (id, step_number, title, objective, sort_order) VALUES ('s1', '1', 'A', 'O', 0)")
    db.run("INSERT INTO steps (id, step_number, title, objective, sort_order) VALUES ('s2', '1', 'B', 'O', 1)")
    const result = validateProjectIntegrity(db)
    expect(result.issues.some((i) => /duplicate step number/i.test(i))).toBe(true)
  })

  test('warns for stuck in_progress steps', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order, status, updated_at) VALUES ('step-1', '1', 'T', 'O', 0, 'in_progress', datetime('now', '-10 days'))",
    )
    const result = validateProjectIntegrity(db)
    expect(result.warnings.some((w) => /stuck/i.test(w))).toBe(true)
  })

  test('warns when step past scenario generation has no test scenarios', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order, status) VALUES ('step-1', '1', 'T', 'O', 0, 'scenarios_generated')",
    )
    const result = validateProjectIntegrity(db)
    expect(result.warnings.some((w) => /no tracked test scenarios/i.test(w))).toBe(true)
  })

  test('warns when step past design generation lacks approved HLD and LLD', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order, status) VALUES ('step-1', '1', 'T', 'O', 0, 'design_generated')",
    )
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-1', 'step-1', 'hld', '{}', 'approved')",
    )
    const result = validateProjectIntegrity(db)
    expect(result.issues.length).toBe(0)
    expect(result.warnings.some((w) => /lacks approved HLD and LLD/i.test(w))).toBe(true)
  })

  test('does not warn when step has both approved HLD and LLD', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order, status) VALUES ('step-1', '1', 'T', 'O', 0, 'design_generated')",
    )
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-1', 'step-1', 'hld', '{}', 'approved')",
    )
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-2', 'step-1', 'lld', '{}', 'approved')",
    )
    const result = validateProjectIntegrity(db)
    expect(result.warnings.some((w) => /lacks approved HLD and LLD/i.test(w))).toBe(false)
  })
})

describe('applyStepTransition', () => {
  test('updates step status and logs worklog', () => {
    const db = createDb()
    seedStep(db, 'step-1', { status: 'pending' })
    applyStepTransition(db, 'step-1', 'start', 'pending', 'in_progress')
    const step = db.query('SELECT status FROM steps WHERE id = ?').get('step-1') as { status: string }
    expect(step.status).toBe('in_progress')
    const wl = db.query('SELECT * FROM worklog WHERE step_id = ?').all('step-1') as any[]
    expect(wl.length).toBe(1)
    expect(wl[0].action).toBe('start')
  })
})

describe('stepExists', () => {
  test('returns true for existing step', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(stepExists(db, 'step-1')).toBe(true)
  })

  test('returns false for non-existing step', () => {
    const db = createDb()
    expect(stepExists(db, 'nonexistent')).toBe(false)
  })

  test('returns false in empty DB', () => {
    const db = createDb()
    expect(stepExists(db, 'step-1')).toBe(false)
  })
})
