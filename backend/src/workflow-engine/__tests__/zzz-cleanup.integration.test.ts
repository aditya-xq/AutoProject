import { test, afterAll } from 'bun:test'
import { Database } from 'bun:sqlite'
import { rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { C, getReportPath } from './helpers'
import { generateReport } from './report'

const _globalStart = performance.now()

const CLEANUP_DIRS = [
  join(tmpdir(), 'workflow-engine-integration-test'),
  join(tmpdir(), 'workflow-engine-prompts-test'),
  join(tmpdir(), 'workflow-engine-onboarding-init-test'),
  join(tmpdir(), 'workflow-engine-onboarding-flow-test'),
  join(tmpdir(), 'workflow-live-e2e'),
]
const LIVE_STEP_IDS = ['step-9001', 'step-9002']

function resolveLiveDbPath(): string | null {
  const root = process.env.AUTOPROJECT_ROOT
  if (!root) return null
  const dbPath = join(root, '.autoproject', 'autoproject.db')
  if (!existsSync(dbPath)) return null
  return dbPath
}

function hasLiveE2eData(dbPath: string): boolean {
  try {
    const db = new Database(dbPath)
    const row = db
      .query(
        `SELECT COUNT(*) as cnt FROM steps WHERE id IN (${LIVE_STEP_IDS.map(() => '?').join(',')})`,
      )
      .get(...LIVE_STEP_IDS) as { cnt: number } | undefined
    db.close()
    return (row?.cnt ?? 0) > 0
  } catch {
    return false
  }
}

function cleanupLiveWorkflowData(): void {
  const dbPath = resolveLiveDbPath()
  if (!dbPath) return

  try {
    const db = new Database(dbPath)
    const promptRows = db
      .query(
        `SELECT id FROM prompt_runs
         WHERE step_id IN (${LIVE_STEP_IDS.map(() => '?').join(',')})
            OR input_context LIKE '%Live E2E%'
            OR input_context LIKE '%step-9001%'
            OR input_context LIKE '%step-9002%'`,
      )
      .all(...LIVE_STEP_IDS) as { id: string }[]
    const promptRunIds = promptRows.map((row) => row.id)

    db.transaction(() => {
      for (const runId of promptRunIds) {
        db.query('DELETE FROM worklog WHERE details LIKE ?').run(`%${runId}%`)
      }
      db.query(
        `DELETE FROM worklog
         WHERE step_id IN (${LIVE_STEP_IDS.map(() => '?').join(',')})
            OR details LIKE '%step-9001%'
            OR details LIKE '%step-9002%'
            OR details LIKE '%9001%'
            OR details LIKE '%9002%'`,
      ).run(...LIVE_STEP_IDS)
      db.query(`DELETE FROM steps WHERE id IN (${LIVE_STEP_IDS.map(() => '?').join(',')})`).run(
        ...LIVE_STEP_IDS,
      )
      if (promptRunIds.length > 0) {
        db.query(
          `DELETE FROM prompt_runs WHERE id IN (${promptRunIds.map(() => '?').join(',')})`,
        ).run(...promptRunIds)
      }
    })()

    db.close()
    console.log(`  ${C.green}✓${C.nc} Cleaned workflow live E2E database rows`)
  } catch (e) {
    console.log(
      `  ${C.yellow}⊘${C.nc} Workflow live E2E DB cleanup skipped: ${(e as Error).message}`,
    )
  }
}

function cleanupLiveWorkflowFiles(): void {
  const root = process.env.AUTOPROJECT_ROOT
  if (!root) return

  for (const path of [
    join(root, 'PROJECT.md'),
    join(root, '.autoproject', 'AGENTS.md'),
    join(root, '.autoproject', 'init-skill.md'),
    join(root, '.autoproject', 'runtime-skill.md'),
    join(root, '.autoproject', 'mcp.json'),
  ]) {
    try {
      if (existsSync(path)) rmSync(path, { force: true })
    } catch {
      // best-effort while the live backend may still be running
    }
  }
}

test('[Integration] placeholder', () => {})

afterAll(() => {
  const liveDbPath = resolveLiveDbPath()
  if (liveDbPath && hasLiveE2eData(liveDbPath)) {
    cleanupLiveWorkflowData()
    cleanupLiveWorkflowFiles()
  }

  for (const dir of CLEANUP_DIRS) {
    try {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true })
        console.log(`  ${C.green}✓${C.nc} Cleaned up: ${dir}`)
      }
    } catch {
      // best-effort
    }
  }

  const reportPath = getReportPath()
  generateReport(_globalStart, reportPath)

  console.log()
  console.log(`  ${C.yellow}Open in browser to explore:${C.nc}`)
  console.log(`    ${C.cyan}${reportPath}${C.nc}`)
})
