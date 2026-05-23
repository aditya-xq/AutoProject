import { test, afterAll } from 'bun:test'
import { Database } from 'bun:sqlite'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { C, getReportPath } from './helpers'
import { generateReport } from './report'

const _globalStart = performance.now()

const TEST_PROMPT_CONTEXTS = [
  'Build a calculator app with add, subtract, multiply, divide.',
  'Completed step 1: setup project',
]

function resolveDbPath(): string {
  const autoRoot = process.env.AUTOPROJECT_ROOT
  if (autoRoot) {
    const candidate = join(autoRoot, '.autoproject', 'autoproject.db')
    if (existsSync(candidate)) return candidate
  }
  return ''
}

function cleanup(): void {
  const dbPath = resolveDbPath()
  if (!dbPath) return

  try {
    if (!existsSync(dbPath)) return
    const db = new Database(dbPath)
    const promptRuns = db
      .query(
        `SELECT id FROM prompt_runs
         WHERE ${TEST_PROMPT_CONTEXTS.map(() => 'input_context LIKE ?').join(' OR ')}`,
      )
      .all(...TEST_PROMPT_CONTEXTS.map((context) => `%${context}%`)) as { id: string }[]

    if (promptRuns.length > 0) {
      db.transaction(() => {
        for (const run of promptRuns) {
          db.query('DELETE FROM worklog WHERE details LIKE ?').run(`%${run.id}%`)
        }
        db.query(
          `DELETE FROM prompt_runs WHERE id IN (${promptRuns.map(() => '?').join(',')})`,
        ).run(...promptRuns.map((run) => run.id))
      })()
      console.log(`  ${C.green}✓${C.nc} Cleaned up ${promptRuns.length} live LLM prompt run(s)`)
    }
    db.close()
  } catch {
    /* best-effort cleanup */
  }
}

test('[Integration] placeholder', () => {})

afterAll(() => {
  cleanup()
  const reportPath = getReportPath()
  generateReport(_globalStart, reportPath)

  console.log()
  console.log(`  ${C.yellow}Open in browser to explore:${C.nc}`)
  console.log(`    ${C.cyan}${reportPath}${C.nc}`)
})
