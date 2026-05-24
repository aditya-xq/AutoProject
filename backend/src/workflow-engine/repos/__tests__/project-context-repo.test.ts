import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'
import { initializeDatabase } from '../../database'
import { writeProjectContext, readProjectContext } from '../project-context-repo'

const TEST_ROOT = join(tmpdir(), 'repos-project-context-test')
const PROJECT_MD_PATH = join(TEST_ROOT, 'PROJECT.md')

function createDb(): Database {
  const db = new Database(':memory:')
  initializeDatabase(db)
  return db
}

beforeAll(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true })
  mkdirSync(TEST_ROOT, { recursive: true })
})

afterAll(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true })
})

describe('writeProjectContext', () => {
  test('writes content to a new file', () => {
    const db = createDb()
    const result = writeProjectContext(db, PROJECT_MD_PATH, '# My Project\n\nHello World')
    expect(result.path).toBe(PROJECT_MD_PATH)
    expect(result.updated).toBe(true)
    expect(existsSync(PROJECT_MD_PATH)).toBe(true)
    expect(readFileSync(PROJECT_MD_PATH, 'utf-8')).toBe('# My Project\n\nHello World')
  })

  test('overwrites existing file', () => {
    const db = createDb()
    writeProjectContext(db, PROJECT_MD_PATH, '# Version 1')
    writeProjectContext(db, PROJECT_MD_PATH, '# Version 2')
    expect(readFileSync(PROJECT_MD_PATH, 'utf-8')).toBe('# Version 2')
  })

  test('logs worklog entry', () => {
    const db = createDb()
    writeProjectContext(db, PROJECT_MD_PATH, '# Worklog test')
    const wl = db.query("SELECT action FROM worklog WHERE action = 'project-context-updated'").get() as any
    expect(wl).not.toBeNull()
  })

  test('creates parent directory if it does not exist', () => {
    const deepPath = join(TEST_ROOT, 'nested', 'subdir', 'PROJECT.md')
    const db = createDb()
    const result = writeProjectContext(db, deepPath, '# Deep')
    expect(result.updated).toBe(true)
    expect(existsSync(deepPath)).toBe(true)
    rmSync(join(TEST_ROOT, 'nested'), { recursive: true, force: true })
  })
})

describe('readProjectContext', () => {
  test('returns exists:false and empty content when file missing', () => {
    const missingPath = join(TEST_ROOT, 'MISSING.md')
    const result = readProjectContext(missingPath)
    expect(result.exists).toBe(false)
    expect(result.content).toBe('')
    expect(result.path).toBe(missingPath)
  })

  test('returns file content when it exists', () => {
    writeProjectContext(createDb(), PROJECT_MD_PATH, '# Read me')
    const result = readProjectContext(PROJECT_MD_PATH)
    expect(result.exists).toBe(true)
    expect(result.content).toBe('# Read me')
  })

  test('returns correct path', () => {
    const result = readProjectContext(PROJECT_MD_PATH)
    expect(result.path).toBe(PROJECT_MD_PATH)
  })

  test('handles empty file', () => {
    writeProjectContext(createDb(), PROJECT_MD_PATH, '')
    const result = readProjectContext(PROJECT_MD_PATH)
    expect(result.exists).toBe(true)
    expect(result.content).toBe('')
  })

  test('handles unicode content', () => {
    writeProjectContext(createDb(), PROJECT_MD_PATH, '# Unicöde → UTF-8 ✓')
    const result = readProjectContext(PROJECT_MD_PATH)
    expect(result.content).toContain('Unicöde')
    expect(result.content).toContain('✓')
  })
})
