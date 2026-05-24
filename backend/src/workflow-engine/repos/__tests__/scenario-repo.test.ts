import { describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'
import { initializeDatabase } from '../../database'
import { clearPromptCache } from '../../prompts'
import {
  importStepScenarios,
  queryStepScenarios,
  updateScenario,
} from '../scenario-repo'

const TEST_ROOT = join(tmpdir(), 'repos-scenario-test')
const PROMPTS_PATH = join(TEST_ROOT, 'prompts.json')

const SAMPLE_PROMPTS = {
  version: 1,
  prompts: {
    'test-scenarios': {
      version: 1,
      purpose: 'Test',
      system: 'You are QA.',
      output_schema: { type: 'array' },
    },
  },
}

function setupPrompts() {
  clearPromptCache()
  rmSync(TEST_ROOT, { recursive: true, force: true })
  mkdirSync(TEST_ROOT, { recursive: true })
  writeFileSync(PROMPTS_PATH, JSON.stringify(SAMPLE_PROMPTS), 'utf-8')
}

function createDb(): Database {
  const db = new Database(':memory:')
  initializeDatabase(db)
  return db
}

function seedStep(db: Database, id = 'step-1') {
  const sn = id.replace(/^step-/, '')
  db.run(
    "INSERT OR IGNORE INTO steps (id, step_number, title, objective, sort_order) VALUES (?, ?, 'Test', 'Objective', 0)",
    [id, sn],
  )
}

describe('importStepScenarios', () => {
  test('imports scenarios from array', () => {
    const db = createDb()
    seedStep(db)
    const result = importStepScenarios(db, 'step-1', {
      scenarios: [
        { title: 'Login', expected_result: 'Success', priority: 'high' },
        { title: 'Logout', expected_result: 'Complete', priority: 'medium' },
      ],
    })
    expect(result.imported).toBe(2)
    expect(result.stepId).toBe('step-1')
  })

  test('rejects empty array', () => {
    const db = createDb()
    seedStep(db)
    expect(() => importStepScenarios(db, 'step-1', { scenarios: [] })).toThrow(/non-empty/)
  })

  test('rejects missing array', () => {
    const db = createDb()
    seedStep(db)
    expect(() => importStepScenarios(db, 'step-1', {})).toThrow(/non-empty/)
  })

  test('rejects scenarios missing title', () => {
    const db = createDb()
    seedStep(db)
    expect(() =>
      importStepScenarios(db, 'step-1', { scenarios: [{ expected_result: 'OK' }] }),
    ).toThrow(/title/)
  })

  test('rejects scenarios missing expected_result', () => {
    const db = createDb()
    seedStep(db)
    expect(() =>
      importStepScenarios(db, 'step-1', { scenarios: [{ title: 'Test' }] }),
    ).toThrow(/expected_result/)
  })

  test('throws for non-existent step', () => {
    const db = createDb()
    expect(() =>
      importStepScenarios(db, 'step-999', { scenarios: [{ title: 'T', expected_result: 'OK' }] }),
    ).toThrow(/not found/)
  })

  test('associates with promptRunId and marks it completed', () => {
    setupPrompts()
    const db = createDb()
    seedStep(db)
    db.run(
      "INSERT INTO prompt_runs (id, step_id, prompt_key, prompt_version, input_context, status) VALUES ('pr-1', 'step-1', 'test-scenarios', 1, '{}', 'created')",
    )
    importStepScenarios(db, 'step-1', {
      promptRunId: 'pr-1',
      scenarios: [{ title: 'T', expected_result: 'OK' }],
    })
    const run = db.query('SELECT status, output_ref FROM prompt_runs WHERE id = ?').get('pr-1') as any
    expect(run.status).toBe('completed')
    expect(run.output_ref).toMatch(/test_scenarios/)
  })

  test('persists scenarios in database', () => {
    const db = createDb()
    seedStep(db)
    importStepScenarios(db, 'step-1', {
      scenarios: [{ title: 'Persist check', expected_result: 'OK' }],
    })
    const rows = db.query('SELECT * FROM test_scenarios').all() as any[]
    expect(rows.length).toBe(1)
    expect(rows[0].title).toBe('Persist check')
  })

  test('handles maximum title length truncation', () => {
    const db = createDb()
    seedStep(db)
    const longTitle = 'x'.repeat(200)
    importStepScenarios(db, 'step-1', {
      scenarios: [{ title: longTitle, expected_result: 'OK' }],
    })
    const row = db.query('SELECT title FROM test_scenarios').get() as { title: string }
    expect(row.title.length).toBe(150)
  })
})

describe('queryStepScenarios', () => {
  test('returns empty array when no scenarios exist', () => {
    const db = createDb()
    seedStep(db)
    const result = queryStepScenarios(db, 'step-1')
    expect(result.scenarios).toEqual([])
  })

  test('returns scenarios for the step', () => {
    const db = createDb()
    seedStep(db)
    importStepScenarios(db, 'step-1', {
      scenarios: [{ title: 'S1', expected_result: 'OK' }, { title: 'S2', expected_result: 'OK' }],
    })
    const result = queryStepScenarios(db, 'step-1')
    expect(result.scenarios.length).toBe(2)
  })

  test('throws for non-existent step', () => {
    const db = createDb()
    expect(() => queryStepScenarios(db, 'step-999')).toThrow(/not found/)
  })

  test('scenarios are ordered by created_at', () => {
    const db = createDb()
    seedStep(db)
    importStepScenarios(db, 'step-1', { scenarios: [{ title: 'First', expected_result: 'OK' }] })
    importStepScenarios(db, 'step-1', { scenarios: [{ title: 'Second', expected_result: 'OK' }] })
    const result = queryStepScenarios(db, 'step-1')
    expect(result.scenarios[0].title).toBe('First')
    expect(result.scenarios[1].title).toBe('Second')
  })
})

describe('updateScenario', () => {
  function seedScenario(db: Database, id = 'sc-1', status = 'proposed') {
    seedStep(db)
    db.run(
      "INSERT INTO test_scenarios (id, step_id, title, expected_result, status) VALUES (?, 'step-1', 'Test', 'OK', ?)",
      [id, status],
    )
  }

  test('updates scenario status to automated', () => {
    const db = createDb()
    seedScenario(db)
    const result = updateScenario(db, 'sc-1', 'automated')
    expect(result.status).toBe('automated')
  })

  test('updates scenario status to passing', () => {
    const db = createDb()
    seedScenario(db)
    updateScenario(db, 'sc-1', 'passing')
    const row = db.query('SELECT status FROM test_scenarios WHERE id = ?').get('sc-1') as { status: string }
    expect(row.status).toBe('passing')
  })

  test('updates scenario status to failing', () => {
    const db = createDb()
    seedScenario(db)
    updateScenario(db, 'sc-1', 'failing')
    const row = db.query('SELECT status FROM test_scenarios WHERE id = ?').get('sc-1') as { status: string }
    expect(row.status).toBe('failing')
  })

  test('updates scenario status to deferred', () => {
    const db = createDb()
    seedScenario(db)
    updateScenario(db, 'sc-1', 'deferred')
    const row = db.query('SELECT status FROM test_scenarios WHERE id = ?').get('sc-1') as { status: string }
    expect(row.status).toBe('deferred')
  })

  test('rejects invalid status', () => {
    const db = createDb()
    seedScenario(db)
    expect(() => updateScenario(db, 'sc-1', 'bogus')).toThrow(/Invalid scenario status/)
  })

  test('throws for non-existent scenario', () => {
    const db = createDb()
    expect(() => updateScenario(db, 'sc-nonexistent', 'automated')).toThrow(/not found/)
  })

  test('rejects empty status string', () => {
    const db = createDb()
    seedScenario(db)
    expect(() => updateScenario(db, 'sc-1', '')).toThrow(/Invalid/)
  })
})
