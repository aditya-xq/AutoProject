import { randomUUID } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { requireNonEmpty } from '../../shared/validation'
import { invalid, notFound } from '../../shared/errors'
import { getStep } from '../workflow'

/** Create a test suite for a step with optional custom file patterns.
 * Defaults to `['*.test.ts']` when no patterns are provided.
 * Throws `invalid` if all file patterns are empty after filtering,
 * or `notFound` if the step doesn't exist. */
export function createTestSuite(
  db: Database,
  stepId: string,
  input: { name?: string; filePatterns?: string[] },
): { id: string; stepId: string; name: string; file_patterns: string[] } {
  const name = requireNonEmpty(input.name, 'name')
  getStep(db, stepId)
  const id = `ts-${randomUUID().slice(0, 8)}`
  const patterns = input.filePatterns?.length
    ? input.filePatterns.map(String).map((p) => p.trim()).filter(Boolean)
    : ['*.test.ts']
  if (patterns.length === 0)
    throw invalid('filePatterns must contain at least one non-empty pattern')
  db.run(
    "INSERT INTO test_suites (id, step_id, name, file_patterns, status) VALUES (?, ?, ?, ?, 'pending')",
    [id, stepId, name, JSON.stringify(patterns)],
  )
  return { id, stepId, name, file_patterns: patterns }
}

/** Query a test suite by ID. Throws `notFound` if missing. */
export function querySuite(db: Database, id: string): unknown {
  const suite = db.query('SELECT * FROM test_suites WHERE id = ?').get(id)
  if (!suite) throw notFound(`Test suite '${id}' not found`)
  return suite
}

export function querySuiteList(db: Database): { suites: unknown[] } {
  return {
    suites: db
      .query(
        'SELECT ts.*, s.step_number, s.title as step_title FROM test_suites ts LEFT JOIN steps s ON s.id = ts.step_id ORDER BY ts.created_at DESC',
      )
      .all(),
  }
}
