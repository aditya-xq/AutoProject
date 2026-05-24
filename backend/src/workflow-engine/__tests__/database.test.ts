import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import {
  initializeDatabase,
  bulkInsertSteps,
  logWorklog,
  STEP_STATUSES,
  SCENARIO_STATUSES,
  GATE_STATUSES,
  PRIORITIES,
  SUITE_STATUSES,
  REQ_STATUSES,
  PROMPT_RUN_STATUSES,
  DESIGN_STATUSES,
  ACTIVE_STEP_STATUSES,
} from '../database'
import type { StepDef } from '../database'

function createDb(): Database {
  const db = new Database(':memory:')
  initializeDatabase(db)
  return db
}

describe('constants', () => {
  test('STEP_STATUSES includes all statuses', () => {
    expect(STEP_STATUSES).toContain('pending')
    expect(STEP_STATUSES).toContain('completed')
    expect(STEP_STATUSES).toContain('failed')
    expect(STEP_STATUSES).toContain('skipped')
  })

  test('ACTIVE_STEP_STATUSES is a subset of STEP_STATUSES', () => {
    for (const s of ACTIVE_STEP_STATUSES) {
      expect(STEP_STATUSES).toContain(s as (typeof STEP_STATUSES)[number])
    }
  })

  test('SCENARIO_STATUSES are valid', () => {
    expect(SCENARIO_STATUSES).toContain('proposed')
    expect(SCENARIO_STATUSES).toContain('automated')
    expect(SCENARIO_STATUSES).toContain('passing')
  })

  test('GATE_STATUSES are valid', () => {
    expect(GATE_STATUSES).toContain('pass')
    expect(GATE_STATUSES).toContain('fail')
    expect(GATE_STATUSES).toContain('error')
  })

  test('PRIORITIES are valid', () => {
    expect(PRIORITIES).toContain('critical')
    expect(PRIORITIES).toContain('high')
    expect(PRIORITIES).toContain('medium')
    expect(PRIORITIES).toContain('low')
  })

  test('SUITE_STATUSES are valid', () => {
    expect(SUITE_STATUSES).toContain('pending')
    expect(SUITE_STATUSES).toContain('passing')
  })

  test('REQ_STATUSES are valid', () => {
    expect(REQ_STATUSES).toContain('active')
    expect(REQ_STATUSES).toContain('superseded')
  })

  test('PROMPT_RUN_STATUSES are valid', () => {
    expect(PROMPT_RUN_STATUSES).toContain('created')
    expect(PROMPT_RUN_STATUSES).toContain('completed')
    expect(PROMPT_RUN_STATUSES).toContain('failed')
  })

  test('DESIGN_STATUSES are valid', () => {
    expect(DESIGN_STATUSES).toContain('draft')
    expect(DESIGN_STATUSES).toContain('approved')
    expect(DESIGN_STATUSES).toContain('superseded')
  })
})

describe('initializeDatabase', () => {
  test('sets WAL mode and foreign keys', () => {
    const db = new Database(':memory:')
    initializeDatabase(db)
    expect(db.query('PRAGMA journal_mode').get()).toBeDefined()
    expect(db.query('PRAGMA foreign_keys').get()).toBeDefined()
  })

  test('creates all tables', () => {
    const db = createDb()
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
    const names = tables.map((t) => t.name)
    expect(names).toContain('meta')
    expect(names).toContain('steps')
    expect(names).toContain('worklog')
    expect(names).toContain('test_suites')
    expect(names).toContain('quality_gate_runs')
    expect(names).toContain('requirements')
    expect(names).toContain('prompt_runs')
    expect(names).toContain('test_scenarios')
    expect(names).toContain('design_artifacts')
  })

  test('is idempotent', () => {
    const db = new Database(':memory:')
    initializeDatabase(db)
    expect(() => initializeDatabase(db)).not.toThrow()
  })
})

describe('createSchema - constraints', () => {
  test('steps CHECK constraint rejects invalid status', () => {
    const db = createDb()
    expect(() =>
      db.run(
        "INSERT INTO steps (id, step_number, title, objective, status, sort_order) VALUES ('s-1', '1', 'T', 'O', 'bogus', 0)",
      ),
    ).toThrow()
  })

  test('test_scenarios CHECK constraint rejects invalid priority', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order) VALUES ('step-1', '1', 'T', 'O', 0)",
    )
    expect(() =>
      db.run(
        "INSERT INTO test_scenarios (id, step_id, title, expected_result, priority) VALUES ('sc-1', 'step-1', 'T', 'OK', 'ultra')",
      ),
    ).toThrow()
  })
})

describe('bulkInsertSteps', () => {
  test('inserts multiple steps with correct defaults', () => {
    const db = createDb()
    const defs: StepDef[] = [
      {
        id: 'step-1',
        number: '1',
        title: 'First Step',
        objective: 'Do first thing',
        context: '',
        testSuite: '',
        implementationPlan: '',
        validation: 'lint',
        sortOrder: 0,
        dependsOnStepId: null,
      },
      {
        id: 'step-2',
        number: '2',
        title: 'Second Step',
        objective: 'Do second thing',
        context: '',
        testSuite: '',
        implementationPlan: '',
        validation: 'typecheck',
        sortOrder: 1,
        dependsOnStepId: 'step-1',
      },
    ]

    bulkInsertSteps(db, defs)
    const rows = db.query('SELECT * FROM steps ORDER BY sort_order').all() as {
      id: string
      title: string
      status: string
      depends_on_step_id: string | null
    }[]
    expect(rows.length).toBe(2)
    expect(rows[0].id).toBe('step-1')
    expect(rows[0].status).toBe('pending')
    expect(rows[1].depends_on_step_id).toBe('step-1')
  })

  test('throws on duplicate inserts', () => {
    const db = createDb()
    const defs: StepDef[] = [
      {
        id: 'step-1',
        number: '1',
        title: 'Test',
        objective: 'Test',
        context: '',
        testSuite: '',
        implementationPlan: '',
        validation: '',
        sortOrder: 0,
        dependsOnStepId: null,
      },
    ]
    bulkInsertSteps(db, defs)
    expect(() => bulkInsertSteps(db, defs)).toThrow(/unique constraint/i)
  })
})

describe('logWorklog', () => {
  test('inserts worklog entry with details JSON', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order) VALUES ('step-1', '1', 'T', 'O', 0)",
    )
    logWorklog(db, 'step-1', 'test-action', { key: 'value' })
    const rows = db.query('SELECT * FROM worklog').all() as {
      id: string
      step_id: string | null
      action: string
      details: string
    }[]
    expect(rows.length).toBe(1)
    expect(rows[0].step_id).toBe('step-1')
    expect(rows[0].action).toBe('test-action')
    expect(JSON.parse(rows[0].details)).toEqual({ key: 'value' })
  })

  test('inserts worklog without step_id', () => {
    const db = createDb()
    logWorklog(db, null, 'import-steps')
    const row = db.query('SELECT * FROM worklog').get() as {
      step_id: string | null
      action: string
    }
    expect(row.step_id).toBeNull()
    expect(row.action).toBe('import-steps')
  })
})
