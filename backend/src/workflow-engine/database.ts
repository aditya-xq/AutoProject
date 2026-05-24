import { Database } from 'bun:sqlite'
export { Database } from 'bun:sqlite'
import { randomUUID } from 'node:crypto'
import type { Json } from '../shared/types'

export const STEP_STATUSES = [
  'pending',
  'in_progress',
  'scenarios_generated',
  'design_generated',
  'tests_built',
  'implemented',
  'completed',
  'failed',
  'skipped',
] as const

export const SCENARIO_STATUSES = [
  'proposed',
  'automated',
  'passing',
  'failing',
  'deferred',
] as const
export const GATE_STATUSES = ['pass', 'fail', 'error'] as const
export const DESIGN_TYPES = ['hld', 'lld'] as const
export const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
export const SUITE_STATUSES = ['pending', 'passing', 'failing', 'error'] as const
export const REQ_STATUSES = ['active', 'superseded', 'rejected'] as const
export const PROMPT_RUN_STATUSES = ['created', 'completed', 'failed'] as const
export const DESIGN_STATUSES = ['draft', 'approved', 'superseded'] as const

export const ACTIVE_STEP_STATUSES = [
  'in_progress',
  'scenarios_generated',
  'design_generated',
  'tests_built',
  'implemented',
]

export type StepStatus = (typeof STEP_STATUSES)[number]
export type ScenarioStatus = (typeof SCENARIO_STATUSES)[number]
export type Priority = (typeof PRIORITIES)[number]
export type SuiteStatus = (typeof SUITE_STATUSES)[number]
export type GateStatus = (typeof GATE_STATUSES)[number]
export type DesignType = (typeof DESIGN_TYPES)[number]
export type DesignStatus = (typeof DESIGN_STATUSES)[number]
export type ReqStatus = (typeof REQ_STATUSES)[number]
export type PromptRunStatus = (typeof PROMPT_RUN_STATUSES)[number]

export interface StepRow {
  id: string
  step_number: string
  title: string
  objective: string
  context: string
  test_suite: string
  implementation_plan: string
  validation: string
  status: StepStatus
  sort_order: number
  depends_on_step_id: string | null
  created_at: string
  updated_at: string
}

export interface ScenarioRow {
  id: string
  step_id: string
  prompt_run_id: string | null
  title: string
  category: string
  priority: Priority
  preconditions: string
  steps: string
  expected_result: string
  automation_notes: string
  coverage_tags: string
  status: ScenarioStatus
  created_at: string
  updated_at: string
}

export interface DesignArtifactRow {
  id: string
  step_id: string
  prompt_run_id: string | null
  artifact_type: DesignType
  content: string
  status: DesignStatus
  created_at: string
  updated_at: string
}

export interface SuiteRow {
  id: string
  step_id: string
  name: string
  file_patterns: string
  status: SuiteStatus
  last_output: string
  created_at: string
  updated_at: string
}

export interface GateRunRow {
  id: string
  step_id: string
  gate_name: string
  status: GateStatus
  output: string
  duration_ms: number
  created_at: string
}

export interface WorklogRow {
  id: string
  step_id: string | null
  action: string
  details: string
  created_at: string
}

export interface RequirementRow {
  id: string
  source: string
  body: string
  status: ReqStatus
  created_at: string
  updated_at: string
}

export interface PromptRunRow {
  id: string
  step_id: string | null
  prompt_key: string
  prompt_version: number
  input_context: string
  output_ref: string
  status: PromptRunStatus
  created_at: string
  updated_at: string
}

export interface MetaRow {
  key: string
  value: string
}

export interface CountResult {
  cnt: number
}

export function createSchema(db: Database): void {
  db.run('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
  db.run(`CREATE TABLE IF NOT EXISTS steps (
      id                  TEXT PRIMARY KEY,
      step_number         TEXT NOT NULL,
      title               TEXT NOT NULL,
      objective           TEXT NOT NULL,
      context             TEXT DEFAULT '',
      test_suite          TEXT DEFAULT '',
      implementation_plan TEXT DEFAULT '',
      validation          TEXT DEFAULT '',
      status              TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN (${STEP_STATUSES.map((s) => `'${s}'`).join(',')})),
      sort_order          INTEGER NOT NULL,
      depends_on_step_id  TEXT REFERENCES steps(id) ON DELETE RESTRICT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  db.run(`CREATE TABLE IF NOT EXISTS worklog (
      id TEXT PRIMARY KEY,
      step_id TEXT REFERENCES steps(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  db.run(`CREATE TABLE IF NOT EXISTS test_suites (
      id TEXT PRIMARY KEY,
      step_id TEXT NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      file_patterns TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (${SUITE_STATUSES.map((s) => `'${s}'`).join(',')})),
      last_output TEXT DEFAULT '' CHECK(length(last_output) <= 5000),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  db.run(`CREATE TABLE IF NOT EXISTS quality_gate_runs (
      id TEXT PRIMARY KEY,
      step_id TEXT NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
      gate_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN (${GATE_STATUSES.map((s) => `'${s}'`).join(',')})),
      output TEXT DEFAULT '',
      duration_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  db.run(`CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'user',
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN (${REQ_STATUSES.map((s) => `'${s}'`).join(',')})),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  db.run(`CREATE TABLE IF NOT EXISTS prompt_runs (
      id TEXT PRIMARY KEY,
      step_id TEXT REFERENCES steps(id) ON DELETE CASCADE,
      prompt_key TEXT NOT NULL,
      prompt_version INTEGER NOT NULL,
      input_context TEXT NOT NULL DEFAULT '{}',
      output_ref TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'created' CHECK(status IN (${PROMPT_RUN_STATUSES.map((s) => `'${s}'`).join(',')})),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  db.run(`CREATE TABLE IF NOT EXISTS test_scenarios (
      id TEXT PRIMARY KEY,
      step_id TEXT NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
      prompt_run_id TEXT REFERENCES prompt_runs(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'functional',
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN (${PRIORITIES.map((s) => `'${s}'`).join(',')})),
      preconditions TEXT NOT NULL DEFAULT '[]',
      steps TEXT NOT NULL DEFAULT '[]',
      expected_result TEXT NOT NULL,
      automation_notes TEXT NOT NULL DEFAULT '',
      coverage_tags TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN (${SCENARIO_STATUSES.map((s) => `'${s}'`).join(',')})),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  db.run(`CREATE TABLE IF NOT EXISTS design_artifacts (
      id TEXT PRIMARY KEY,
      step_id TEXT NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
      prompt_run_id TEXT REFERENCES prompt_runs(id) ON DELETE SET NULL,
      artifact_type TEXT NOT NULL CHECK(artifact_type IN (${DESIGN_TYPES.map((s) => `'${s}'`).join(',')})),
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN (${DESIGN_STATUSES.map((s) => `'${s}'`).join(',')})),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  db.run('CREATE INDEX IF NOT EXISTS idx_prompt_runs_step ON prompt_runs(step_id)')
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_steps_step_number_unique ON steps(step_number)')
  db.run('CREATE INDEX IF NOT EXISTS idx_steps_status_sort ON steps(status, sort_order)')
  db.run('CREATE INDEX IF NOT EXISTS idx_test_scenarios_step ON test_scenarios(step_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_design_artifacts_step ON design_artifacts(step_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_test_suites_step ON test_suites(step_id)')
  db.run(
    'CREATE INDEX IF NOT EXISTS idx_quality_gate_runs_step_gate ON quality_gate_runs(step_id, gate_name, created_at)',
  )
  db.run('CREATE INDEX IF NOT EXISTS idx_worklog_step_action ON worklog(step_id, action)')
  db.run('CREATE INDEX IF NOT EXISTS idx_worklog_created_at ON worklog(created_at DESC)')
}

export function initializeDatabase(db: Database): void {
  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  createSchema(db)
}

export function bulkInsertSteps(db: Database, steps: StepDef[]): void {
  const insert = db.prepare(
    `INSERT INTO steps (id, step_number, title, objective, context, test_suite, implementation_plan, validation, status, sort_order, depends_on_step_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  )
  db.transaction(() => {
    for (const step of steps) {
      insert.run(
        step.id,
        step.number,
        step.title,
        step.objective,
        step.context,
        step.testSuite,
        step.implementationPlan,
        step.validation,
        step.sortOrder,
        step.dependsOnStepId,
      )
    }
  })()
}

export interface StepDef {
  id: string
  number: string
  title: string
  objective: string
  context: string
  testSuite: string
  implementationPlan: string
  validation: string
  sortOrder: number
  dependsOnStepId: string | null
}

export function logWorklog(
  db: Database,
  stepId: string | null,
  action: string,
  details: Json = {},
): void {
  db.run(
    "INSERT INTO worklog (id, step_id, action, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
    [randomUUID(), stepId, action, JSON.stringify(details)],
  )
}
