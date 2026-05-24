import { randomUUID } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { invalid, notFound } from '../../shared/errors'
import { requirePromptRun, normalizeScenarios } from '../prompts'
import { getStep } from '../workflow'
import { logWorklog, ScenarioRow, SCENARIO_STATUSES } from '../database'
import type { Json } from '../../shared/types'

/** Import test scenarios for a step inside a transaction.
 *
 * Scenarios are normalized and validated before insertion.
 * If `promptRunId` is provided, the corresponding prompt run is marked completed. */
export function importStepScenarios(
  db: Database,
  stepId: string,
  input: { promptRunId?: string; scenarios?: Json[] },
): { stepId: string; imported: number } {
  const scenarios = input.scenarios
  if (!Array.isArray(scenarios) || scenarios.length === 0)
    throw invalid('scenarios must be a non-empty array')

  getStep(db, stepId)
  if (input.promptRunId) requirePromptRun(db, input.promptRunId, stepId)

  const normalized = normalizeScenarios(scenarios)

  const insert = db.prepare(
    `INSERT INTO test_scenarios (id, step_id, prompt_run_id, title, category, priority, preconditions, steps, expected_result, automation_notes, coverage_tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  db.transaction(() => {
    for (const scenario of normalized) {
      insert.run(
        `sc-${randomUUID().slice(0, 8)}`,
        stepId,
        input.promptRunId || null,
        scenario.title,
        scenario.category,
        scenario.priority,
        scenario.preconditions,
        scenario.steps,
        scenario.expected,
        scenario.automationNotes,
        scenario.coverageTags,
      )
    }
    if (input.promptRunId)
      db.run(
        "UPDATE prompt_runs SET status = 'completed', output_ref = ?, updated_at = datetime('now') WHERE id = ?",
        [`test_scenarios:${normalized.length}`, input.promptRunId],
      )
  })()

  const count = normalized.length
  logWorklog(db, stepId, 'scenario-import', { count, promptRunId: input.promptRunId || null })
  return { stepId, imported: count }
}

/** Query all scenarios for a step. Throws `notFound` if the step doesn't exist. */
export function queryStepScenarios(db: Database, stepId: string): { stepId: string; scenarios: ScenarioRow[] } {
  getStep(db, stepId)
  return {
    stepId,
    scenarios: db
      .query('SELECT * FROM test_scenarios WHERE step_id = ? ORDER BY created_at')
      .all(stepId) as ScenarioRow[],
  }
}

/** Update a scenario's status. Validates that the status is one of the
 * allowed {@link SCENARIO_STATUSES}. Throws `notFound` if the scenario
 * doesn't exist. */
export function updateScenario(db: Database, id: string, status: string) {
  const s = status || ''
  if (!SCENARIO_STATUSES.includes(s as (typeof SCENARIO_STATUSES)[number]))
    throw invalid('Invalid scenario status')
  const scenario = db.query('SELECT id, step_id FROM test_scenarios WHERE id = ?').get(id) as
    | Pick<ScenarioRow, 'id' | 'step_id'>
    | undefined
  if (!scenario) throw notFound(`Scenario '${id}' not found`)
  db.run("UPDATE test_scenarios SET status = ?, updated_at = datetime('now') WHERE id = ?", [
    s,
    id,
  ])
  logWorklog(db, scenario.step_id, 'scenario-status', { scenarioId: id, status: s })
  return { id, status: s }
}
