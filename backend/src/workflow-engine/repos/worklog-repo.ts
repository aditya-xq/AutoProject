import { Database } from 'bun:sqlite'
import type { WorklogRow } from '../database'

export function queryWorklog(
  db: Database,
  stepId?: string,
): { entries: WorklogRow[] } {
  const entries = stepId
    ? (db.query('SELECT * FROM worklog WHERE step_id = ? ORDER BY created_at DESC').all(stepId) as WorklogRow[])
    : (db.query('SELECT * FROM worklog ORDER BY created_at DESC LIMIT 50').all() as WorklogRow[])
  return { entries }
}
