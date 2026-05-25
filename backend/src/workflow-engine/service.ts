import { Database } from 'bun:sqlite'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { ApiError, ErrorCodes, conflict, invalid } from '../shared/errors'
import { requireNonEmpty } from '../shared/validation'
import {
  AUTOPROJECT_DIR as DEFAULT_AUTOPROJECT_DIR,
  BACKEND_DIR as DEFAULT_BACKEND_DIR,
  DB_PATH as DEFAULT_DB_PATH,
  PROMPTS_PATH as DEFAULT_PROMPTS_PATH,
  PROJECT_CONTEXT_PATH as DEFAULT_PROJECT_CONTEXT_PATH,
  ROOT as DEFAULT_ROOT,
} from './paths'
import { initializeDatabase, logWorklog } from './database'
import {
  validateTransition,
  gatePlan,
  assertCanStart,
  assertScenarioReady,
  assertDesignReady,
  assertTestsReady,
  assertHasWorklog,
  assertCanComplete,
  getCurrentStep,
  getNextPendingStep,
  getStep,
} from './workflow'
import { runQualityGates, getGateRuns, runTestSuite } from './gates'
import { listPrompts, renderPrompt as renderPromptDef, completePrompt } from './prompts'
import type { StepInput } from './repos/step-repo'
import {
  importStepsBatch,
  createStep as repoCreateStep,
  updateStepFields,
  deleteStepById,
  getStepList,
  getProjectStatusData,
  validateProjectIntegrity,
  applyStepTransition,
} from './repos/step-repo'
import { insertRequirement, queryRequirements } from './repos/requirement-repo'
import { importStepScenarios, queryStepScenarios, updateScenario } from './repos/scenario-repo'
import { importDesignArtifacts, queryDesignArtifacts } from './repos/design-repo'
import {
  createTestSuite as repoCreateTestSuite,
  querySuite,
  querySuiteList,
} from './repos/suite-repo'
import { queryWorklog } from './repos/worklog-repo'
import { writeProjectContext, readProjectContext } from './repos/project-context-repo'
import type { Json } from '../shared/types'

export type AutoProjectPaths = {
  root: string
  autoprojectDir: string
  dbPath: string
  promptsPath: string
  projectContextPath: string
  backendDir: string
}

const DEFAULT_PATHS: AutoProjectPaths = {
  root: DEFAULT_ROOT,
  autoprojectDir: DEFAULT_AUTOPROJECT_DIR,
  dbPath: DEFAULT_DB_PATH,
  promptsPath: DEFAULT_PROMPTS_PATH,
  projectContextPath: DEFAULT_PROJECT_CONTEXT_PATH,
  backendDir: DEFAULT_BACKEND_DIR,
}

const AGENT_ASSET_FILES = ['AGENTS.md', 'init-skill.md', 'runtime-skill.md'] as const

function appLog(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
  const entry = { level, timestamp: new Date().toISOString(), message, ...meta }
  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export class AutoProjectService {
  private _db: Database | null = null

  constructor(private readonly paths: AutoProjectPaths = DEFAULT_PATHS) {}

  private openDB(): Database {
    if (this._db) return this._db
    this.ensureAgentAssets()
    this._db = new Database(this.paths.dbPath)
    initializeDatabase(this._db)
    appLog('info', 'Database opened', { path: this.paths.dbPath })
    return this._db
  }

  /**
   * Initialize (or re-initialize) the workflow database.
   * Ensures agent asset files exist ({@link AGENT_ASSET_FILES}), closes any
   * existing connection, then opens a fresh database with the full schema,
   * clearing all existing data.
   * Safe to call multiple times (idempotent).
   */
  init() {
    const assets = this.ensureAgentAssets()
    this._db?.close()
    this._db = null
    this.openDB()
    const db = this._db
    db.run('PRAGMA foreign_keys = OFF')
    db.transaction(() => {
      db.run('DELETE FROM worklog')
      db.run('DELETE FROM quality_gate_runs')
      db.run('DELETE FROM test_suites')
      db.run('DELETE FROM prompt_runs')
      db.run('DELETE FROM design_artifacts')
      db.run('DELETE FROM test_scenarios')
      db.run('DELETE FROM requirements')
      db.run('DELETE FROM steps')
      db.run('DELETE FROM meta')
    })()
    db.run('PRAGMA foreign_keys = ON')
    return { message: 'Database initialized', db: this.paths.dbPath, assets }
  }

  /** Alias for {@link importSteps}. Provided for backward compatibility. */
  seed(input: { steps?: StepInput[] }) {
    return this.importSteps(input)
  }

  addRequirement(input: { body?: string; source?: string }) {
    return insertRequirement(this.openDB(), input.body || '', input.source)
  }

  listRequirements() {
    return queryRequirements(this.openDB())
  }

  /** Return aggregate project state: steps, stats, meta, and the current step (if any). Throws 404 if the database does not exist. */
  projectStatus() {
    if (!existsSync(this.paths.dbPath))
      throw new ApiError(ErrorCodes.NO_DB, 'Project not initialized', 404)
    return getProjectStatusData(this.openDB())
  }

  /** Run integrity checks (orphan deps, duplicate numbers, stuck steps, missing scenarios/designs). Throws 404 if the database does not exist. */
  validateProject() {
    if (!existsSync(this.paths.dbPath))
      throw new ApiError(ErrorCodes.NO_DB, 'Project not initialized', 404)
    return validateProjectIntegrity(this.openDB())
  }

  /**
   * Return the current eligible step.
   * Priority: active step (non-terminal) → next pending step with satisfied
   * dependencies → `"All steps completed"` → throws {@link ErrorCodes.BLOCKED}.
   * Implementation plans are redacted via {@link gatePlan} for steps that have
   * not yet reached {@link PLAN_VISIBLE_STATUSES}.
   */
  currentStep() {
    const db = this.openDB()
    const active = getCurrentStep(db)
    if (active) return gatePlan(active)

    const pending = getNextPendingStep(db)
    if (pending) return gatePlan(pending)

    const remaining = db
      .query("SELECT COUNT(*) as cnt FROM steps WHERE status NOT IN ('completed','skipped')")
      .get() as { cnt: number }
    if (remaining.cnt === 0) return { message: 'All steps completed' }
    throw conflict(
      ErrorCodes.BLOCKED,
      `No eligible step. ${remaining.cnt} step(s) blocked by dependencies.`,
    )
  }

  getStep(id: string) {
    const db = this.openDB()
    return gatePlan(getStep(db, id))
  }

  /**
   * Transition a step along the workflow state machine.
   * Validates the action against the current status, runs pre-flight
   * assertions (e.g. scenarios imported, quality gates passed), then
   * persists the transition.
   * Throws {@link invalid} for illegal transitions, {@link conflict}
   * for unsatisfied preconditions.
   */
  stepAction(id: string, action: string) {
    const db = this.openDB()
    const step = getStep(db, id)
    const to = validateTransition(step, action)

    if (action === 'start') assertCanStart(db, id)
    if (action === 'scenarios-generated') assertScenarioReady(db, id)
    if (action === 'design-generated') assertDesignReady(db, id)
    if (action === 'tests-built') assertTestsReady(db, id)
    if (action === 'implemented')
      assertHasWorklog(db, id, 'tests-built', 'Tests must be built before implementing')
    if (action === 'complete') assertCanComplete(db, id)

    applyStepTransition(db, id, action, step.status, to)

    return {
      stepId: id,
      action,
      from: step.status,
      to,
      message: `Step '${id}' transitioned from '${step.status}' to '${to}'`,
    }
  }

  listPrompts() {
    return listPrompts(this.paths.promptsPath)
  }

  renderPrompt(promptKey: string, input: { stepId?: string; context?: string }) {
    const db = this.openDB()
    const result = renderPromptDef(
      this.paths.promptsPath,
      db,
      promptKey,
      input,
      this.paths.projectContextPath,
    )
    logWorklog(db, null, 'prompt-render', {
      runId: result.runId,
      promptKey,
      promptVersion: result.promptVersion,
    })
    return result
  }

  /**
   * Complete a prompt run and log the outcome to the worklog.
   * Resolves the associated step from `prompt_runs` for worklog attribution.
   */
  completePrompt(runId: string, input: { status?: string; outputRef?: string }) {
    const db = this.openDB()
    const result = completePrompt(db, runId, input)
    const row = db.query('SELECT step_id FROM prompt_runs WHERE id = ?').get(runId)
    const stepId = row && typeof row === 'object' && 'step_id' in row
      ? (row as { step_id: string | null }).step_id
      : null
    logWorklog(db, stepId, 'prompt-complete', {
      runId,
      status: result.status,
      outputRef: result.outputRef,
    })
    return result
  }

  importScenarios(stepId: string, input: { promptRunId?: string; scenarios?: Json[] }) {
    return importStepScenarios(this.openDB(), stepId, input)
  }

  listScenarios(stepId: string) {
    return queryStepScenarios(this.openDB(), stepId)
  }

  /** Update the status of a test scenario. Throws {@link invalid} if status is empty or unrecognised. */
  updateScenarioStatus(id: string, input: { status?: string }) {
    const status = input.status?.trim()
    if (!status) throw invalid('status is required')
    return updateScenario(this.openDB(), id, status)
  }

  importDesign(stepId: string, input: { promptRunId?: string; hld?: unknown; lld?: unknown }) {
    return importDesignArtifacts(this.openDB(), stepId, input)
  }

  getDesign(stepId: string) {
    return queryDesignArtifacts(this.openDB(), stepId)
  }

  createTestSuite(stepId: string, input: { name?: string; filePatterns?: string[] }) {
    return repoCreateTestSuite(this.openDB(), stepId, input)
  }

  runTestSuite(id: string) {
    return runTestSuite(this.openDB(), id, this.paths.root)
  }

  testSuiteStatus(id?: string) {
    if (id) return querySuite(this.openDB(), id)
    return querySuiteList(this.openDB())
  }

  async runQualityGates(stepId: string) {
    const db = this.openDB()
    getStep(db, stepId)
    return runQualityGates(db, stepId, this.paths.root)
  }

  qualityGateStatus(stepId?: string) {
    const db = this.openDB()
    if (stepId) getStep(db, stepId)
    return { runs: getGateRuns(db, stepId) }
  }

  worklog(stepId?: string) {
    return queryWorklog(this.openDB(), stepId)
  }

  importSteps(input: { steps?: StepInput[] }) {
    return importStepsBatch(this.openDB(), input.steps || [])
  }

  createStep(input: StepInput) {
    return repoCreateStep(this.openDB(), input)
  }

  updateStep(
    id: string,
    input: Partial<StepInput & { status?: string; depends_on?: string | null }>,
  ) {
    return updateStepFields(this.openDB(), id, input)
  }

  deleteStep(id: string) {
    return deleteStepById(this.openDB(), id)
  }

  listSteps() {
    return getStepList(this.openDB())
  }

  updateProjectContext(content: string) {
    const db = this.openDB()
    return writeProjectContext(db, this.paths.projectContextPath, content)
  }

  getProjectContext() {
    return readProjectContext(this.paths.projectContextPath)
  }

  /**
   * Onboard a new project: writes the project context file, inserts a
   * requirement and metadata, and optionally imports an initial set of steps.
   * All DB operations (and the context file write) happen inside a single
   * SQLite transaction for atomicity.
   * Throws {@link conflict} (`ALREADY_INITIALIZED`) if steps already exist.
   */
  onboard(input: {
    requirements?: string
    projectContext?: string
    generateSteps?: boolean
    steps?: StepInput[]
  }) {
    const requirements = requireNonEmpty(input.requirements, 'requirements')
    const projectContext = requireNonEmpty(input.projectContext, 'projectContext')
    const db = this.openDB()

    const initialProjectMd = projectContext.startsWith('#')
      ? projectContext
      : `# ${basename(this.paths.root)}\n\n## Mission\n${requirements.slice(0, 200)}\n\n## Existing Context\n${projectContext}\n\n## State\nOnboarding complete, steps pending.\n`

    return db.transaction(() => {
      const existing = db.query('SELECT COUNT(*) as cnt FROM steps').get() as { cnt: number }
      if (existing.cnt > 0)
        throw conflict(
          ErrorCodes.ALREADY_INITIALIZED,
          'Project already has steps. Use /api/onboard only for fresh projects.',
        )

      writeProjectContext(db, this.paths.projectContextPath, initialProjectMd)

      const requirementId = `req-${randomUUID().slice(0, 8)}`
      db.run("INSERT INTO requirements (id, source, body, status) VALUES (?, ?, ?, 'active')", [
        requirementId,
        'onboard',
        requirements,
      ])

      db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('onboarded_at', datetime('now'))")
      db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('requirements_summary', ?)", [
        requirements.slice(0, 500),
      ])
      logWorklog(db, null, 'onboard', {
        requirementId,
        projectContextPath: this.paths.projectContextPath,
      })

      const assets = this.ensureAgentAssets()
      if (input.steps && input.steps.length > 0) {
        const imported = importStepsBatch(db, input.steps)
        return {
          message: 'Onboarded and imported steps.',
          requirementId,
          projectMd: initialProjectMd,
          assets,
          ...imported,
        }
      }

      return {
        message:
          'Onboarded. Generate steps via MCP prompts_execute with promptKey "step-generation", then import them with MCP steps_import.',
        requirementId,
        projectMd: initialProjectMd,
        assets,
        next: [
          'prompts_execute:step-generation',
          'steps_import',
          'project_status',
          'project_validate',
        ],
      }
    })()
  }

  /**
   * Close the database connection if open. Idempotent and safe to call
   * multiple times; errors during close are logged but not thrown.
   */
  closeDB() {
    if (this._db) {
      try {
        this._db.close()
        appLog('info', 'Database closed', { path: this.paths.dbPath })
      } catch (e) {
        appLog('warn', 'Error closing database', { path: this.paths.dbPath, error: String(e) })
      }
      this._db = null
    }
  }

  [Symbol.dispose]() {
    this.closeDB()
  }

  private ensureAgentAssets() {
    if (!existsSync(this.paths.autoprojectDir))
      mkdirSync(this.paths.autoprojectDir, { recursive: true })
    const created: string[] = []
    const existing: string[] = []

    for (const assetFile of AGENT_ASSET_FILES) {
      const path = join(this.paths.autoprojectDir, assetFile)
      const templatePath = join(import.meta.dir, 'templates', assetFile)
      if (existsSync(path)) {
        existing.push(path)
      } else if (existsSync(templatePath)) {
        writeFileSync(path, readFileSync(templatePath, 'utf-8'), 'utf-8')
        created.push(path)
      }
    }

    const mcpConfigPath = join(this.paths.autoprojectDir, 'mcp.json')
    const mcpConfig = {
      mcpServers: {
        autoproject: {
          command: 'bun',
          args: ['run', '--cwd', this.paths.backendDir, 'mcp'],
          env: { AUTOPROJECT_ROOT: this.paths.root },
        },
      },
    }
    if (existsSync(mcpConfigPath)) {
      existing.push(mcpConfigPath)
    } else {
      writeFileSync(mcpConfigPath, `${JSON.stringify(mcpConfig, null, 2)}\n`, 'utf-8')
      created.push(mcpConfigPath)
    }

    return { directory: this.paths.autoprojectDir, created, existing, mcpConfigPath }
  }
}

export const autoProjectService = new AutoProjectService()
