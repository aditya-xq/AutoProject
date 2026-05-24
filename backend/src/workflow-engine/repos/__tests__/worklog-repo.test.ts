import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initializeDatabase } from '../../database'
import { queryWorklog } from '../worklog-repo'

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

function insertWorklog(
  db: Database,
  stepId: string | null,
  action: string,
  createdAt?: string,
) {
  const id = `wl-${Math.random().toString(36).slice(2, 8)}`
  const ts = createdAt ? `datetime('${createdAt}')` : "datetime('now')"
  db.run(
    `INSERT INTO worklog (id, step_id, action, details, created_at) VALUES (?, ?, ?, '{}', ${ts})`,
    [id, stepId, action],
  )
}

describe('queryWorklog', () => {
  test('returns empty array when no entries exist', () => {
    const db = createDb()
    const result = queryWorklog(db)
    expect(result.entries).toEqual([])
  })

  test('returns entries ordered by created_at DESC', () => {
    const db = createDb()
    insertWorklog(db, null, 'action-1', '2024-01-01')
    insertWorklog(db, null, 'action-2', '2024-01-02')
    insertWorklog(db, null, 'action-3', '2024-01-03')
    const result = queryWorklog(db)
    expect(result.entries.length).toBe(3)
    expect(result.entries[0].action).toBe('action-3')
    expect(result.entries[2].action).toBe('action-1')
  })

  test('limits to 50 entries without stepId', () => {
    const db = createDb()
    for (let i = 0; i < 60; i++) {
      insertWorklog(db, null, `bulk-${i}`)
    }
    const result = queryWorklog(db)
    expect(result.entries.length).toBe(50)
  })

  test('filters by stepId when provided', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    insertWorklog(db, 'step-1', 'action-a')
    insertWorklog(db, 'step-2', 'action-b')
    insertWorklog(db, 'step-1', 'action-c')
    const result = queryWorklog(db, 'step-1')
    expect(result.entries.length).toBe(2)
    for (const entry of result.entries) {
      expect(entry.step_id).toBe('step-1')
    }
  })

  test('does not limit when filtering by stepId', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    for (let i = 0; i < 60; i++) {
      insertWorklog(db, 'step-1', `step-action-${i}`)
    }
    const result = queryWorklog(db, 'step-1')
    expect(result.entries.length).toBe(60)
  })

  test('returns empty array for stepId with no entries', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    const result = queryWorklog(db, 'step-1')
    expect(result.entries).toEqual([])
  })

  test('returns entries with correct fields', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    insertWorklog(db, 'step-1', 'test-action')
    const result = queryWorklog(db, 'step-1')
    const entry = result.entries[0] as any
    expect(entry.id).toBeDefined()
    expect(entry.step_id).toBe('step-1')
    expect(entry.action).toBe('test-action')
    expect(entry.details).toBeDefined()
    expect(entry.created_at).toBeDefined()
  })

  test('returns entries with null step_id', () => {
    const db = createDb()
    insertWorklog(db, null, 'global-action')
    const result = queryWorklog(db)
    expect(result.entries[0].step_id).toBeNull()
    expect(result.entries[0].action).toBe('global-action')
  })
})
