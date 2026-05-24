import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initializeDatabase } from '../../database'
import {
  insertRequirement,
  queryRequirements,
} from '../requirement-repo'

function createDb(): Database {
  const db = new Database(':memory:')
  initializeDatabase(db)
  return db
}

describe('insertRequirement', () => {
  test('inserts requirement with provided source', () => {
    const db = createDb()
    const result = insertRequirement(db, 'Build a login system', 'product')
    expect(result.id).toMatch(/^req-/)
    expect(result.source).toBe('product')
  })

  test('defaults source to user', () => {
    const db = createDb()
    const result = insertRequirement(db, 'Must support dark mode')
    expect(result.source).toBe('user')
  })

  test('trims whitespace from body', () => {
    const db = createDb()
    const result = insertRequirement(db, '  trimmed body  ')
    const row = db.query('SELECT body FROM requirements WHERE id = ?').get(result.id) as { body: string }
    expect(row.body).toBe('trimmed body')
  })

  test('rejects empty body', () => {
    const db = createDb()
    expect(() => insertRequirement(db, '', 'user')).toThrow(/Requirement body is required/)
  })

  test('rejects blank body', () => {
    const db = createDb()
    expect(() => insertRequirement(db, '   ', 'user')).toThrow(/Requirement body is required/)
  })

  test('rejects null body', () => {
    const db = createDb()
    expect(() => insertRequirement(db, null as any, 'user')).toThrow(/Requirement body is required/)
  })

  test('persists with active status by default', () => {
    const db = createDb()
    const result = insertRequirement(db, 'Persist check', 'user')
    const row = db.query('SELECT body, status, source FROM requirements WHERE id = ?').get(result.id) as any
    expect(row.body).toBe('Persist check')
    expect(row.status).toBe('active')
    expect(row.source).toBe('user')
  })

  test('logs worklog entry on insert', () => {
    const db = createDb()
    insertRequirement(db, 'Test worklog', 'user')
    const wl = db.query("SELECT action FROM worklog WHERE action = 'requirement-add'").get() as any
    expect(wl).not.toBeNull()
  })
})

describe('queryRequirements', () => {
  test('returns empty array when no requirements exist', () => {
    const db = createDb()
    const result = queryRequirements(db)
    expect(result.requirements).toEqual([])
  })

  test('returns requirements ordered by created_at DESC', () => {
    const db = createDb()
    db.exec("INSERT INTO requirements (id, source, body, status, created_at) VALUES ('req-old', 'user', 'First', 'active', '2024-01-01')")
    db.exec("INSERT INTO requirements (id, source, body, status, created_at) VALUES ('req-new', 'user', 'Second', 'active', '2024-06-01')")
    const result = queryRequirements(db)
    expect(result.requirements.length).toBe(2)
    expect((result.requirements[0] as any).body).toBe('Second')
    expect((result.requirements[1] as any).body).toBe('First')
  })

  test('returns all fields of each requirement', () => {
    const db = createDb()
    const { id } = insertRequirement(db, 'Full check', 'product')
    const result = queryRequirements(db)
    const req = result.requirements[0] as any
    expect(req.id).toBe(id)
    expect(req.body).toBe('Full check')
    expect(req.source).toBe('product')
    expect(req.status).toBe('active')
    expect(req.created_at).toBeDefined()
  })

  test('contains multiple requirements', () => {
    const db = createDb()
    insertRequirement(db, 'Req 1', 'user')
    insertRequirement(db, 'Req 2', 'product')
    insertRequirement(db, 'Req 3', 'analyst')
    const result = queryRequirements(db)
    expect(result.requirements.length).toBe(3)
  })
})
