import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initializeDatabase } from '../../database'
import {
  createTestSuite,
  querySuite,
  querySuiteList,
} from '../suite-repo'

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

describe('createTestSuite', () => {
  test('creates a suite with default file pattern', () => {
    const db = createDb()
    seedStep(db)
    const result = createTestSuite(db, 'step-1', { name: 'Core Tests' })
    expect(result.id).toMatch(/^ts-/)
    expect(result.name).toBe('Core Tests')
    expect(result.file_patterns).toEqual(['*.test.ts'])
  })

  test('creates a suite with custom file patterns', () => {
    const db = createDb()
    seedStep(db)
    const result = createTestSuite(db, 'step-1', {
      name: 'Unit Tests',
      filePatterns: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    })
    expect(result.file_patterns).toEqual(['src/**/*.test.ts', 'tests/**/*.test.ts'])
  })

  test('trims whitespace from file patterns', () => {
    const db = createDb()
    seedStep(db)
    const result = createTestSuite(db, 'step-1', {
      name: 'Trim Test',
      filePatterns: ['  src/*.test.ts  ', '  tests/*.test.ts  '],
    })
    expect(result.file_patterns).toEqual(['src/*.test.ts', 'tests/*.test.ts'])
  })

  test('filters out empty patterns', () => {
    const db = createDb()
    seedStep(db)
    const result = createTestSuite(db, 'step-1', {
      name: 'Filter Test',
      filePatterns: ['real.test.ts', '', '  '],
    })
    expect(result.file_patterns).toEqual(['real.test.ts'])
  })

  test('rejects empty filePatterns after filtering', () => {
    const db = createDb()
    seedStep(db)
    expect(() =>
      createTestSuite(db, 'step-1', { name: 'Empty', filePatterns: ['', '  '] }),
    ).toThrow(/at least one/)
  })

  test('requires name', () => {
    const db = createDb()
    seedStep(db)
    expect(() => createTestSuite(db, 'step-1', {} as any)).toThrow(/name is required/)
  })

  test('throws for non-existent step', () => {
    const db = createDb()
    expect(() => createTestSuite(db, 'step-999', { name: 'X' })).toThrow(/not found/)
  })

  test('persists suite with pending status', () => {
    const db = createDb()
    seedStep(db)
    createTestSuite(db, 'step-1', { name: 'Persist check' })
    const row = db.query('SELECT name, status FROM test_suites WHERE step_id = ?').get('step-1') as any
    expect(row.name).toBe('Persist check')
    expect(row.status).toBe('pending')
  })
})

describe('querySuite', () => {
  test('returns suite by id', () => {
    const db = createDb()
    seedStep(db)
    const { id } = createTestSuite(db, 'step-1', { name: 'Find me' })
    const result = querySuite(db, id) as any
    expect(result.name).toBe('Find me')
    expect(result.step_id).toBe('step-1')
  })

  test('throws for non-existent suite', () => {
    const db = createDb()
    expect(() => querySuite(db, 'ts-nonexistent')).toThrow(/not found/)
  })

  test('returns all suite fields', () => {
    const db = createDb()
    seedStep(db)
    const { id } = createTestSuite(db, 'step-1', { name: 'Full Check' })
    const result = querySuite(db, id) as any
    expect(result.id).toBe(id)
    expect(result.name).toBe('Full Check')
    expect(result.step_id).toBe('step-1')
    expect(result.status).toBe('pending')
    expect(result.created_at).toBeDefined()
  })
})

describe('querySuiteList', () => {
  test('returns empty list when no suites exist', () => {
    const db = createDb()
    const result = querySuiteList(db)
    expect(result.suites).toEqual([])
  })

  test('returns all suites with step info', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    createTestSuite(db, 'step-1', { name: 'Suite A' })
    createTestSuite(db, 'step-2', { name: 'Suite B' })
    const result = querySuiteList(db)
    expect(result.suites.length).toBe(2)
    const names = (result.suites as any[]).map((s: any) => s.name).sort()
    expect(names).toEqual(['Suite A', 'Suite B'])
  })

  test('includes step_number and step_title from join', () => {
    const db = createDb()
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order) VALUES ('step-1', '1', 'Setup Step', 'O', 0)",
    )
    createTestSuite(db, 'step-1', { name: 'Join Test' })
    const result = querySuiteList(db)
    const suite = result.suites[0] as any
    expect(suite.step_number).toBe('1')
    expect(suite.step_title).toBe('Setup Step')
  })

  test('orders by created_at DESC', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns, status, created_at) VALUES ('ts-old', 'step-1', 'First', '[\"*.test.ts\"]', 'pending', '2024-01-01')",
    )
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns, status, created_at) VALUES ('ts-new', 'step-1', 'Second', '[\"*.test.ts\"]', 'pending', '2024-06-01')",
    )
    const result = querySuiteList(db)
    expect((result.suites[0] as any).name).toBe('Second')
    expect((result.suites[1] as any).name).toBe('First')
  })
})
