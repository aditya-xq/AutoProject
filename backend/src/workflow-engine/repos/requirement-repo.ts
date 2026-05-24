import { randomUUID } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { invalid } from '../../shared/errors'
import { logWorklog, RequirementRow } from '../database'

/** Insert a new requirement. Validates that body is non-empty after trimming.
 * Defaults source to `'user'` when not provided. */
export function insertRequirement(
  db: Database,
  body: string,
  source?: string,
): { id: string; source: string } {
  const trimmed = String(body || '').trim()
  if (!trimmed) throw invalid('Requirement body is required')
  const id = `req-${randomUUID().slice(0, 8)}`
  const src = source || 'user'
  db.run("INSERT INTO requirements (id, source, body, status) VALUES (?, ?, ?, 'active')", [
    id,
    src,
    trimmed,
  ])
  logWorklog(db, null, 'requirement-add', { id, source: src })
  return { id, source: src }
}

export function queryRequirements(db: Database): { requirements: RequirementRow[] } {
  return {
    requirements: db.query('SELECT * FROM requirements ORDER BY created_at DESC').all() as RequirementRow[],
  }
}
