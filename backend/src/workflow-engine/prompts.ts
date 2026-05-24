import { existsSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { invalid, notFound } from '../shared/errors'
import { normalizeStringArray } from '../shared/validation'
import { Database } from 'bun:sqlite'
import {
  ScenarioRow,
  DesignArtifactRow,
  StepRow,
  PromptRunRow,
  PRIORITIES,
  Priority,
} from './database'
import { gatePlan } from './workflow'

import type { Json } from '../shared/types'

export type PromptFile = {
  version: number
  prompts: Record<string, PromptDefinition>
}

export type PromptDefinition = {
  version: number
  purpose: string
  system: string
  output_schema: unknown
}

const _promptCache = new Map<string, PromptFile>()

/** Read and parse `prompts.json` from disk, caching by path to avoid repeated I/O. */
export function loadPrompts(promptsPath: string): PromptFile {
  const cached = _promptCache.get(promptsPath)
  if (cached) return cached
  if (!existsSync(promptsPath)) throw notFound('prompts.json not found in backend')
  const data = JSON.parse(readFileSync(promptsPath, 'utf-8')) as PromptFile
  _promptCache.set(promptsPath, data)
  return data
}

export function clearPromptCache(): void {
  _promptCache.clear()
}

export function listPrompts(promptsPath: string): {
  version: number
  prompts: { key: string; version: number; purpose: string }[]
} {
  const promptFile = loadPrompts(promptsPath)
  return {
    version: promptFile.version,
    prompts: Object.entries(promptFile.prompts).map(([key, prompt]) => ({
      key,
      version: prompt.version,
      purpose: prompt.purpose,
    })),
  }
}

export interface RenderResult {
  runId: string
  promptKey: string
  promptVersion: number
  messages: { role: string; content: string }[]
  outputSchema: unknown
}

/**
 * Load a prompt definition, assemble its user message from DB context, and
 * record a new `prompt_runs` row in `created` status.
 *
 * Context-only prompts (`step-generation`, `project-context-update`) require
 * `input.context`. Step-scoped prompts (`test-scenarios`, `implementation-design`)
 * require `input.stepId` and assemble context from the step's row, prior
 * completed steps, existing test scenarios, and approved design artifacts.
 */
export function renderPrompt(
  promptsPath: string,
  db: Database,
  promptKey: string,
  input: { stepId?: string; context?: string },
): RenderResult {
  const promptFile = loadPrompts(promptsPath)
  const prompt = promptFile.prompts[promptKey]
  if (!prompt) throw notFound(`Prompt '${promptKey}' not found`)

  let inputContext: string
  let resolvedStepId: string | null = null

  if (promptKey === 'step-generation' || promptKey === 'project-context-update') {
    inputContext = input.context || ''
    if (!inputContext.trim()) throw invalid(`context is required for ${promptKey} prompt`)
  } else {
    if (!input.stepId) throw invalid('stepId is required')
    const step = db.query('SELECT * FROM steps WHERE id = ?').get(input.stepId) as
      | StepRow
      | undefined
    if (!step) throw notFound(`Step '${input.stepId}' not found`)

    inputContext = buildPromptUserMessage(db, step, promptKey, input.context || '')
    resolvedStepId = input.stepId
  }

  const runId = `pr-${randomUUID().slice(0, 8)}`
  db.run(
    "INSERT INTO prompt_runs (id, step_id, prompt_key, prompt_version, input_context, status) VALUES (?, ?, ?, ?, ?, 'created')",
    [runId, resolvedStepId, promptKey, prompt.version, inputContext],
  )

  return {
    runId,
    promptKey,
    promptVersion: prompt.version,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: inputContext },
    ],
    outputSchema: prompt.output_schema,
  }
}

/** Mark a recorded prompt run as `completed` or `failed` with an output reference. */
export function completePrompt(
  db: Database,
  runId: string,
  input: { status?: string; outputRef?: string },
): { runId: string; status: string; outputRef: string } {
  const status = input.status || ''
  if (!['completed', 'failed'].includes(status)) throw invalid('status must be completed or failed')

  const run = db.query('SELECT * FROM prompt_runs WHERE id = ?').get(runId) as
    | PromptRunRow
    | undefined
  if (!run) throw notFound(`Prompt run '${runId}' not found`)

  db.run(
    "UPDATE prompt_runs SET status = ?, output_ref = ?, updated_at = datetime('now') WHERE id = ?",
    [status, input.outputRef || '', runId],
  )

  return { runId, status, outputRef: input.outputRef || '' }
}

/**
 * Assert a prompt run exists and is associated with the expected step.
 * Passes when `stepId` matches or the run has no step association.
 */
export function requirePromptRun(db: Database, promptRunId: string, stepId: string): void {
  const run = db.query('SELECT id, step_id FROM prompt_runs WHERE id = ?').get(promptRunId) as
    | { id: string; step_id: string | null }
    | undefined
  if (!run) throw notFound(`Prompt run '${promptRunId}' not found`)
  if (run.step_id && run.step_id !== stepId)
    throw notFound(
      `Prompt run '${promptRunId}' is associated with step '${run.step_id}', not '${stepId}'`,
    )
}

const PROMPT_INSTRUCTIONS: Record<string, string> = {
  'test-scenarios': 'Generate test scenarios for this single step. Return JSON only.',
  'implementation-design': 'Generate HLD and LLD for this single step. Return JSON only.',
}

/**
 * Assemble the structured LLM user message for a step-scoped prompt.
 * Includes the step (with implementation plan redacted when appropriate via
 * {@link gatePlan}), prior completed steps, existing test scenarios, and
 * approved design artifacts — serialised as pretty-printed JSON.
 */
function buildPromptUserMessage(
  db: Database,
  step: StepRow,
  promptKey: string,
  extraContext: string = '',
): string {
  const scenarios = db
    .query(
      'SELECT title, category, priority, preconditions, steps, expected_result, automation_notes, coverage_tags, status FROM test_scenarios WHERE step_id = ? ORDER BY created_at',
    )
    .all(step.id) as ScenarioRow[]
  const designs = db
    .query(
      "SELECT artifact_type, content, status FROM design_artifacts WHERE step_id = ? AND status = 'approved' ORDER BY artifact_type",
    )
    .all(step.id) as DesignArtifactRow[]
  const priorSteps = db
    .query(
      "SELECT id, step_number, title, objective, status FROM steps WHERE sort_order < ? AND status IN ('completed','skipped') ORDER BY sort_order",
    )
    .all(step.sort_order) as StepRow[]

  return JSON.stringify(
    {
      instruction:
        PROMPT_INSTRUCTIONS[promptKey] || 'Generate the required output for this step. Return JSON only.',
      step: gatePlan(step),
      prior_steps: priorSteps,
      existing_test_scenarios: scenarios,
      existing_design_artifacts: designs,
      additional_context: extraContext,
    },
    null,
    2,
  )
}

export interface NormalizedScenario {
  title: string
  expected: string
  priority: Priority
  category: string
  preconditions: string
  steps: string
  automationNotes: string
  coverageTags: string
}

const MAX_TITLE_LENGTH = 150
const MAX_EXPECTED_LENGTH = 500
const MAX_NOTES_LENGTH = 300
const SCENARIO_CATEGORIES = [
  'functional', 'integration', 'security', 'performance', 'usability', 'error', 'edge',
] as const

function isValidCategory(value: string): boolean {
  return SCENARIO_CATEGORIES.includes(value as typeof SCENARIO_CATEGORIES[number])
}

/**
 * Normalise raw LLM-generated scenario objects into the storage format.
 * Truncates string fields to schema-defined lengths, validates categories
 * against the allowed enum, and serialises array fields as JSON strings.
 */
export function normalizeScenarios(scenarios: Json[]): NormalizedScenario[] {
  return scenarios.map((scenario) => {
    const title = String(scenario.title || '').trim().slice(0, MAX_TITLE_LENGTH)
    const expected = String(scenario.expected_result || '').trim().slice(0, MAX_EXPECTED_LENGTH)
    if (!title || !expected) throw invalid('Every scenario needs title and expected_result')
    const priority = PRIORITIES.includes(String(scenario.priority) as Priority)
      ? (String(scenario.priority) as Priority)
      : 'medium'
    const category = String(scenario.category || 'functional')
    return {
      title,
      expected,
      priority,
      category: isValidCategory(category) ? category : 'functional',
      preconditions: JSON.stringify(normalizeStringArray(scenario.preconditions)),
      steps: JSON.stringify(normalizeStringArray(scenario.steps)),
      automationNotes: String(scenario.automation_notes || '').trim().slice(0, MAX_NOTES_LENGTH),
      coverageTags: JSON.stringify(normalizeStringArray(scenario.coverage_tags)),
    }
  })
}
