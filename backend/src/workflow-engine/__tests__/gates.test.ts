import { describe, expect, test, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initializeDatabase } from '../database'
import { getGateRuns, runTestSuite, runQualityGates } from '../gates'

function createDb(): Database {
  const db = new Database(':memory:')
  initializeDatabase(db)
  return db
}

function seedStep(db: Database, id: string): void {
  const stepNumber = id.replace(/^step-/, '')
  db.run(
    "INSERT OR IGNORE INTO steps (id, step_number, title, objective, sort_order) VALUES (?, ?, 'Test', 'Objective', ?)",
    [id, stepNumber, Number(stepNumber) - 1],
  )
}

function makeAsyncProc(exitCode: number, stdout: string, stderr: string) {
  const enc = new TextEncoder()
  return {
    exitCode,
    exited: Promise.resolve(exitCode),
    stdout: new ReadableStream({
      start(controller) {
        controller.enqueue(enc.encode(stdout))
        controller.close()
      },
    }),
    stderr: new ReadableStream({
      start(controller) {
        controller.enqueue(enc.encode(stderr))
        controller.close()
      },
    }),
    kill: () => {},
  }
}

function makeSyncProc(exitCode: number, stdout: string, stderr: string) {
  const enc = new TextEncoder()
  return {
    exitCode,
    stdout: enc.encode(stdout),
    stderr: enc.encode(stderr),
  }
}

function countGateRuns(db: Database): number {
  return (db.query('SELECT COUNT(*) as cnt FROM quality_gate_runs').get() as { cnt: number }).cnt
}

let spawnMock: (...args: any[]) => any
let spawnSyncMock: (...args: any[]) => any

const _origSpawn = Bun.spawn
const _origSpawnSync = Bun.spawnSync

beforeAll(() => {
  Bun.spawn = (...args: any[]) => spawnMock(...args)
  Bun.spawnSync = (...args: any[]) => spawnSyncMock(...args)
})

beforeEach(() => {
  spawnMock = () => makeAsyncProc(0, '', '')
  spawnSyncMock = () => makeSyncProc(0, '', '')
})

afterAll(() => {
  Bun.spawn = _origSpawn
  Bun.spawnSync = _origSpawnSync
})

describe('getGateRuns', () => {
  test('returns empty when no runs exist', () => {
    const db = createDb()
    const runs = getGateRuns(db)
    expect(runs).toEqual([])
  })

  test('filters by stepId when provided', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    db.run(
      "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES ('qg-1', 'step-1', 'lint', 'pass')",
    )
    db.run(
      "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES ('qg-2', 'step-2', 'lint', 'fail')",
    )
    const runs = getGateRuns(db, 'step-1')
    expect(runs.length).toBe(1)
    expect(runs[0].gate_name).toBe('lint')
  })

  test('returns all runs without stepId', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    db.run(
      "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES ('qg-1', 'step-1', 'lint', 'pass')",
    )
    db.run(
      "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES ('qg-2', 'step-2', 'test', 'fail')",
    )
    const runs = getGateRuns(db)
    expect(runs.length).toBe(2)
  })
})

describe('runTestSuite', () => {
  test('throws for non-existent suite', () => {
    const db = createDb()
    expect(() => runTestSuite(db, 'nonexistent', '.')).toThrow()
  })

  test('throws for suite with empty file patterns', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns) VALUES ('ts-1', 'step-1', 'Empty', '[]')",
    )
    expect(() => runTestSuite(db, 'ts-1', '.')).toThrow()
  })

  test('returns passing status on success', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns) VALUES ('ts-1', 'step-1', 'Unit', '[\"src/**/*.test.ts\"]')",
    )
    spawnSyncMock = () => makeSyncProc(0, '✓ 10 tests passed\n', '')

    const result = runTestSuite(db, 'ts-1', '.')
    expect(result.status).toBe('passing')
    expect(result.output).toContain('tests passed')
  })

  test('returns error status when spawn throws', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns) VALUES ('ts-1', 'step-1', 'Unit', '[\"src/**/*.test.ts\"]')",
    )
    spawnSyncMock = () => { throw new Error('Command not found') }

    const result = runTestSuite(db, 'ts-1', '.')
    expect(result.status).toBe('error')
    expect(result.output).toContain('Command not found')
  })

  test('returns failing status on non-zero exit', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns) VALUES ('ts-1', 'step-1', 'Unit', '[\"src/**/*.test.ts\"]')",
    )
    spawnSyncMock = () => makeSyncProc(1, '', '1 test failed')

    const result = runTestSuite(db, 'ts-1', '.')
    expect(result.status).toBe('failing')
    expect(result.output).toContain('test failed')
  })

  test('updates the database on success', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns) VALUES ('ts-1', 'step-1', 'Unit', '[\"src/**/*.test.ts\"]')",
    )
    spawnSyncMock = () => makeSyncProc(0, 'all good', '')

    runTestSuite(db, 'ts-1', '.')
    const suite = db.query('SELECT status, last_output FROM test_suites WHERE id = ?').get('ts-1') as any
    expect(suite.status).toBe('passing')
    expect(suite.last_output).toContain('all good')
  })
})

describe('runQualityGates', () => {
  test('returns allPassed when all gates pass', async () => {
    const db = createDb()
    seedStep(db, 'step-1')
    spawnMock = () => makeAsyncProc(0, 'ok', '')

    const result = await runQualityGates(db, 'step-1', '.', 5000)
    expect(result.allPassed).toBe(true)
    expect(result.gates.length).toBe(4)
    expect(result.gates.every((g) => g.status === 'pass')).toBe(true)
    expect(result.gates.every((g) => g.output === '')).toBe(true)
  })

  test('returns allPassed false when any gate fails', async () => {
    const db = createDb()
    seedStep(db, 'step-2')
    spawnMock = (cmd: string[]) => {
      const isLint = cmd.includes('lint')
      return makeAsyncProc(isLint ? 0 : 1, '', '')
    }

    const result = await runQualityGates(db, 'step-2', '.', 5000)
    expect(result.allPassed).toBe(false)
    expect(result.gates.filter((g) => g.status === 'pass').length).toBe(1)
    expect(result.gates.filter((g) => g.status === 'fail').length).toBe(3)
  })

  test('returns error status when spawn throws', async () => {
    const db = createDb()
    seedStep(db, 'step-3')
    spawnMock = () => { throw new Error('ENOENT: spawn bun ENOENT') }

    const result = await runQualityGates(db, 'step-3', '.', 5000)
    expect(result.allPassed).toBe(false)
    expect(result.gates.every((g) => g.status === 'error')).toBe(true)
    expect(result.gates.every((g) => g.output.length > 0)).toBe(true)
  })

  test('persists gate runs to the database', async () => {
    const db = createDb()
    seedStep(db, 'step-4')
    spawnMock = () => makeAsyncProc(0, 'ok', '')

    await runQualityGates(db, 'step-4', '.', 5000)
    const runs = db.query('SELECT * FROM quality_gate_runs WHERE step_id = ?').all('step-4') as any[]
    expect(runs.length).toBe(4)
    expect(runs.map((r) => r.gate_name).sort()).toEqual(['build', 'lint', 'test', 'typecheck'])
    expect(runs.every((r) => r.status === 'pass')).toBe(true)
  })

  test('cleans up old runs beyond the limit', async () => {
    const db = createDb()
    seedStep(db, 'step-5')
    spawnMock = () => makeAsyncProc(0, 'ok', '')

    for (let i = 0; i < 105; i++) {
      db.run(
        "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES (?, 'step-5', 'lint', 'pass')",
        [`old-${i}`],
      )
    }
    expect(countGateRuns(db)).toBe(105)

    await runQualityGates(db, 'step-5', '.', 5000)
    expect(countGateRuns(db)).toBeLessThanOrEqual(100)
  })
})
