import { test, afterAll } from 'bun:test'
import { Database } from 'bun:sqlite'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { C, passCount, failCount, skipCount, getReportPath } from './helpers'
import { generateReport } from './report'

const _globalStart = performance.now()

let _testStartTs: string = new Date()
  .toISOString()
  .replace(/\.\d+$/, '')
  .replace('T', ' ')

function resolveDbPath(): string {
  const explicit = process.env.CLEANUP_DB_PATH
  if (explicit) return explicit
  const autoRoot = process.env.AUTOPROJECT_ROOT
  if (autoRoot) {
    const candidate = join(autoRoot, '.autoproject', 'autoproject.db')
    if (existsSync(candidate)) return candidate
  }
  const scriptDir = import.meta.dir
  const root = join(scriptDir, '..', '..', '..', '..')
  return join(root, '.autoproject', 'autoproject.db')
}

function cleanup(): void {
  const dbPath = resolveDbPath()
  try {
    if (!existsSync(dbPath)) return
    const db = new Database(dbPath)
    const stmt = db.query('SELECT COUNT(*) as cnt FROM prompt_runs WHERE created_at > ?')
    const row = stmt.get(_testStartTs) as { cnt: number } | undefined
    const count = row?.cnt ?? 0
    if (count > 0) {
      db.query('DELETE FROM prompt_runs WHERE created_at > ?').run(_testStartTs)
      console.log(`  ${C.green}✓${C.nc} Cleaned up ${count} test prompt run(s)`)
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
  console.log(`${C.bold}${C.cyan}══ Summary${' ═'.repeat(25)}${C.nc}`)
  console.log(`  ${C.green}Passed:${C.nc}  ${passCount}`)
  console.log(`  ${C.red}Failed:${C.nc}  ${failCount}`)
  console.log(`  ${C.yellow}Skipped:${C.nc} ${skipCount}`)
  console.log(`  ${C.bold}Total:${C.nc}   ${passCount + failCount + skipCount}`)
  console.log()
  console.log(`  ${C.yellow}Open in browser to explore:${C.nc}`)
  console.log(`    ${C.cyan}${reportPath}${C.nc}`)
})
