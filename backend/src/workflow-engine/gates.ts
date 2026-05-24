import { randomUUID } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { GateStatus, GateRunRow } from './database'
import { notFound, invalid } from '../shared/errors'

const GATE_TIMEOUT_MS = 120000
const TEST_SUITE_TIMEOUT_MS = 60000
const GATE_OUTPUT_LIMIT = 1000
const TEST_SUITE_OUTPUT_LIMIT = 500
const CLEANUP_LIMIT = 100

function decodeOutput(stdout: string, stderr: string, exitCode: number, max = 2000): string {
  const out = stdout.slice(0, max)
  const err = stderr.slice(0, max)
  if (exitCode === 0) return out
  return err || out
}

export interface GateResult {
  gate: string
  status: GateStatus
  duration_ms: number
  output: string
}

const GATE_COMMANDS: { name: string; cmd: string[] }[] = [
  { name: 'lint', cmd: ['bun', 'run', 'lint'] },
  { name: 'typecheck', cmd: ['bun', 'run', 'check'] },
  { name: 'test', cmd: ['bun', 'test'] },
  { name: 'build', cmd: ['bun', 'run', 'build'] },
]

function cleanupGateRuns(db: Database, stepId: string): void {
  db.run(
    `DELETE FROM quality_gate_runs WHERE step_id = ? AND rowid NOT IN (
      SELECT rowid FROM quality_gate_runs WHERE step_id = ? ORDER BY created_at DESC LIMIT ?
    )`,
    [stepId, stepId, CLEANUP_LIMIT],
  )
}

async function runGate(
  db: Database,
  stepId: string,
  gate: { name: string; cmd: string[] },
  cwd: string,
  timeout: number,
): Promise<GateResult> {
  const start = Date.now()
  let output: string
  let status: GateStatus

  try {
    const proc = Bun.spawn(gate.cmd, { cwd, stdout: 'pipe', stderr: 'pipe' })

    const timedOut = await Promise.race([
      proc.exited.then(() => false),
      Bun.sleep(timeout).then(() => {
        proc.kill()
        return true
      }),
    ])

    const stdoutText = await new Response(proc.stdout).text()
    const stderrText = await new Response(proc.stderr).text()

    if (timedOut) {
      output = (stderrText || stdoutText || `\`${gate.name}\` timed out after ${timeout}ms`).slice(0, GATE_OUTPUT_LIMIT)
      status = 'error'
    } else {
      const exitCode = proc.exitCode ?? 1
      output = decodeOutput(stdoutText, stderrText, exitCode, GATE_OUTPUT_LIMIT)
      status = exitCode === 0 ? 'pass' : 'fail'
    }
  } catch (e) {
    output = e instanceof Error ? e.message.slice(0, GATE_OUTPUT_LIMIT) : String(e).slice(0, GATE_OUTPUT_LIMIT)
    status = 'error'
  }

  const duration = Date.now() - start
  db.run(
    'INSERT INTO quality_gate_runs (id, step_id, gate_name, status, output, duration_ms) VALUES (?, ?, ?, ?, ?, ?)',
    [randomUUID(), stepId, gate.name, status, output, duration],
  )

  return {
    gate: gate.name,
    status,
    duration_ms: duration,
    output: status === 'pass' ? '' : output,
  }
}

/**
 * Run all quality gates (lint, typecheck, test, build) **concurrently** for a step.
 * Each gate spawns via {@link Bun.spawn} with an independent timeout.
 * Results are persisted to `quality_gate_runs` and old runs beyond {@link CLEANUP_LIMIT} are pruned.
 */
export async function runQualityGates(
  db: Database,
  stepId: string,
  cwd: string,
  timeout = GATE_TIMEOUT_MS,
): Promise<{ stepId: string; gates: GateResult[]; allPassed: boolean }> {
  const results = await Promise.all(
    GATE_COMMANDS.map((gate) => runGate(db, stepId, gate, cwd, timeout)),
  )
  cleanupGateRuns(db, stepId)
  return { stepId, gates: results, allPassed: results.every((r) => r.status === 'pass') }
}

export function getGateRuns(db: Database, stepId?: string): GateRunRow[] {
  if (stepId) {
    return db
      .query('SELECT * FROM quality_gate_runs WHERE step_id = ? ORDER BY created_at DESC')
      .all(stepId) as GateRunRow[]
  }
  return db
    .query('SELECT * FROM quality_gate_runs ORDER BY created_at DESC LIMIT 20')
    .all() as GateRunRow[]
}

/**
 * Execute the test patterns configured in a {@link TestSuite} via `bun test`.
 * Throws {@link ApiError} (not-found / invalid) if the suite is missing or has no patterns.
 * Returns `passing` on exit 0, `failing` on non-zero, `error` on spawn failure.
 * Truncates output to 500 chars for the response; the full output is stored in the DB.
 */
export function runTestSuite(
  db: Database,
  suiteId: string,
  cwd: string,
  timeout = TEST_SUITE_TIMEOUT_MS,
): { id: string; status: string; duration_ms: number; output: string } {
  const suite = db.query('SELECT * FROM test_suites WHERE id = ?').get(suiteId) as
    | { id: string; step_id: string; file_patterns: string }
    | undefined
  if (!suite) throw notFound(`Test suite '${suiteId}' not found`)

  const patterns = JSON.parse(suite.file_patterns) as string[]
  if (patterns.length === 0) throw invalid('No test file patterns configured')

  const start = Date.now()
  let result: ReturnType<typeof Bun.spawnSync>

  try {
    result = Bun.spawnSync(['bun', 'test', ...patterns], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout,
    })
  } catch (e) {
    const duration = Date.now() - start
    const output = e instanceof Error ? e.message : String(e)
    updateTestSuite(db, suiteId, 'error', output.slice(0, TEST_SUITE_OUTPUT_LIMIT))
    return { id: suiteId, status: 'error', duration_ms: duration, output: output.slice(0, TEST_SUITE_OUTPUT_LIMIT) }
  }

  const duration = Date.now() - start
  const output = decodeOutput(
    new TextDecoder().decode(result.stdout),
    new TextDecoder().decode(result.stderr),
    result.exitCode,
    TEST_SUITE_OUTPUT_LIMIT,
  )
  const status = result.exitCode === 0 ? 'passing' : 'failing'

  updateTestSuite(db, suiteId, status, output)
  return { id: suiteId, status, duration_ms: duration, output }
}

function updateTestSuite(db: Database, suiteId: string, status: string, output: string): void {
  db.run(
    "UPDATE test_suites SET status = ?, last_output = ?, updated_at = datetime('now') WHERE id = ?",
    [status, output, suiteId],
  )
}
