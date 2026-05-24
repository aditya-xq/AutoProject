import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { Database } from 'bun:sqlite'
import { logWorklog } from '../database'

/** Write project context content to disk, creating parent directories if needed. */
export function writeProjectContext(
  db: Database,
  projectContextPath: string,
  content: string,
): { path: string; updated: boolean } {
  const dir = dirname(projectContextPath)
  mkdirSync(dir, { recursive: true })
  writeFileSync(projectContextPath, content, 'utf-8')
  logWorklog(db, null, 'project-context-updated', { path: projectContextPath })
  return { path: projectContextPath, updated: true }
}

export function readProjectContext(projectContextPath: string): {
  exists: boolean
  path: string
  content: string
} {
  const exists = existsSync(projectContextPath)
  return {
    exists,
    path: projectContextPath,
    content: exists ? readFileSync(projectContextPath, 'utf-8') : '',
  }
}
