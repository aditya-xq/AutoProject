import { randomUUID } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { invalid } from '../../shared/errors'
import { requirePromptRun } from '../prompts'
import { getStep } from '../workflow'
import { logWorklog } from '../database'

/** Import HLD and LLD design artifacts for a step inside a transaction.
 *
 * Supersedes any previously approved designs for the same step.
 * If `promptRunId` is provided, the corresponding prompt run is marked completed. */
export function importDesignArtifacts(
  db: Database,
  stepId: string,
  input: { promptRunId?: string; hld?: unknown; lld?: unknown },
): { stepId: string; imported: string[] } {
  if (!input.hld || !input.lld) throw invalid('hld and lld are required')
  getStep(db, stepId)
  if (input.promptRunId) requirePromptRun(db, input.promptRunId, stepId)

  const insert = db.prepare(
    "INSERT INTO design_artifacts (id, step_id, prompt_run_id, artifact_type, content, status) VALUES (?, ?, ?, ?, ?, 'approved')",
  )
  db.transaction(() => {
    db.run(
      "UPDATE design_artifacts SET status = 'superseded', updated_at = datetime('now') WHERE step_id = ? AND artifact_type IN ('hld','lld') AND status = 'approved'",
      [stepId],
    )
    insert.run(
      `da-${randomUUID().slice(0, 8)}`,
      stepId,
      input.promptRunId || null,
      'hld',
      JSON.stringify(input.hld, null, 2),
    )
    insert.run(
      `da-${randomUUID().slice(0, 8)}`,
      stepId,
      input.promptRunId || null,
      'lld',
      JSON.stringify(input.lld, null, 2),
    )
    if (input.promptRunId)
      db.run(
        "UPDATE prompt_runs SET status = 'completed', output_ref = ?, updated_at = datetime('now') WHERE id = ?",
        ['design_artifacts:hld,lld', input.promptRunId],
      )
    logWorklog(db, stepId, 'design-import', { promptRunId: input.promptRunId || null })
  })()
  return { stepId, imported: ['hld', 'lld'] }
}

/** Query approved design artifacts for a step. Throws `notFound` if the step doesn't exist. */
export function queryDesignArtifacts(
  db: Database,
  stepId: string,
): { stepId: string; artifacts: unknown[] } {
  getStep(db, stepId)
  return {
    stepId,
    artifacts: db
      .query(
        "SELECT * FROM design_artifacts WHERE step_id = ? AND status = 'approved' ORDER BY artifact_type",
      )
      .all(stepId),
  }
}
