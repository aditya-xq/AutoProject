import { describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'
import { initializeDatabase } from '../database'
import {
  clearPromptCache,
  loadPrompts,
  listPrompts,
  renderPrompt,
  completePrompt,
  requirePromptRun,
  normalizeScenarios,
} from '../prompts'

const TEST_ROOT = join(tmpdir(), 'workflow-engine-prompts-test')
const PROMPTS_PATH = join(TEST_ROOT, 'prompts.json')

const SAMPLE_PROMPTS = {
  version: 2,
  prompts: {
    'step-generation': {
      version: 1,
      purpose: 'Generate step definitions from requirements',
      system: 'You are a project planner.',
      output_schema: { type: 'object' },
    },
    'test-scenarios': {
      version: 1,
      purpose: 'Generate test scenarios for a step',
      system: 'You are a QA engineer.',
      output_schema: { type: 'array' },
    },
    'implementation-design': {
      version: 1,
      purpose: 'Generate HLD and LLD for a step',
      system: 'You are a principal engineer.',
      output_schema: { type: 'object' },
    },
    'project-context-update': {
      version: 1,
      purpose: 'Update PROJECT.md after completing a step',
      system: 'You are a project documenter.',
      output_schema: { type: 'object' },
    },
  },
}

function writePrompts(): void {
  clearPromptCache()
  rmSync(TEST_ROOT, { recursive: true, force: true })
  mkdirSync(TEST_ROOT, { recursive: true })
  writeFileSync(PROMPTS_PATH, JSON.stringify(SAMPLE_PROMPTS), 'utf-8')
}

function createDb(): Database {
  const db = new Database(':memory:')
  initializeDatabase(db)
  return db
}

function seedStep(db: Database, id = 'step-1'): void {
  db.run(
    "INSERT OR IGNORE INTO steps (id, step_number, title, objective, sort_order) VALUES (?, '1', 'Test', 'Objective', 0)",
    [id],
  )
}

describe('loadPrompts', () => {
  test('loads prompts.json from disk', () => {
    writePrompts()
    clearPromptCache()
    const result = loadPrompts(PROMPTS_PATH)
    expect(result.version).toBe(2)
    expect(Object.keys(result.prompts)).toContain('step-generation')
  })

  test('throws when file not found', () => {
    clearPromptCache()
    expect(() => loadPrompts(join(TEST_ROOT, 'nonexistent.json'))).toThrow()
  })

  test('caches loaded prompts', () => {
    writePrompts()
    clearPromptCache()
    const first = loadPrompts(PROMPTS_PATH)
    // delete the file to prove cache is used
    rmSync(TEST_ROOT, { recursive: true, force: true })
    const second = loadPrompts(PROMPTS_PATH)
    expect(second).toBe(first)
    expect(second.version).toBe(2)
  })

  test('clearPromptCache forces re-read', () => {
    writePrompts()
    clearPromptCache()
    loadPrompts(PROMPTS_PATH)
    clearPromptCache()
    expect(() => loadPrompts(join(TEST_ROOT, 'nonexistent.json'))).toThrow()
  })
})

describe('listPrompts', () => {
  test('returns prompt metadata', () => {
    writePrompts()
    clearPromptCache()
    const result = listPrompts(PROMPTS_PATH)
    expect(result.version).toBe(2)
    expect(result.prompts.length).toBe(4)
    expect(result.prompts[0].key).toBeDefined()
    expect(result.prompts[0].purpose).toBeDefined()
    expect(result.prompts[0].version).toBeDefined()
  })
})

describe('renderPrompt', () => {
  test('renders step-generation prompt with context', () => {
    writePrompts()
    const db = createDb()
    const result = renderPrompt(PROMPTS_PATH, db, 'step-generation', {
      context: 'Build a login system',
    })
    expect(result.runId).toMatch(/^pr-/)
    expect(result.promptKey).toBe('step-generation')
    expect(result.messages.length).toBe(2)
    expect(result.messages[0].role).toBe('system')
    expect(result.messages[1].role).toBe('user')
    expect(result.outputSchema).toBeDefined()
  })

  test('renders test-scenarios prompt with stepId', () => {
    writePrompts()
    const db = createDb()
    seedStep(db, 'step-1')
    const result = renderPrompt(PROMPTS_PATH, db, 'test-scenarios', {
      stepId: 'step-1',
    })
    expect(result.promptKey).toBe('test-scenarios')
    expect(result.runId).toMatch(/^pr-/)
  })

  test('throws when stepId missing for step-specific prompt', () => {
    writePrompts()
    const db = createDb()
    expect(() => renderPrompt(PROMPTS_PATH, db, 'test-scenarios', {})).toThrow(/stepId is required/)
  })

  test('throws when context missing for step-generation', () => {
    writePrompts()
    const db = createDb()
    expect(() => renderPrompt(PROMPTS_PATH, db, 'step-generation', {})).toThrow(
      /context is required/,
    )
  })

  test('throws for unknown prompt key', () => {
    writePrompts()
    const db = createDb()
    expect(() => renderPrompt(PROMPTS_PATH, db, 'unknown-key', { stepId: 'step-1' })).toThrow(
      /Prompt.*not found/,
    )
  })

  test('records prompt run in database', () => {
    writePrompts()
    const db = createDb()
    seedStep(db, 'step-1')
    renderPrompt(PROMPTS_PATH, db, 'test-scenarios', { stepId: 'step-1' })
    const runs = db.query('SELECT * FROM prompt_runs').all()
    expect(runs.length).toBe(1)
  })

  test('renders project-context-update with context', () => {
    writePrompts()
    const db = createDb()
    const result = renderPrompt(PROMPTS_PATH, db, 'project-context-update', {
      context: '# Current project state',
    })
    expect(result.promptKey).toBe('project-context-update')
    expect(result.messages[1].content).toContain('# Current project state')
  })

  test('renders implementation-design with stepId', () => {
    writePrompts()
    const db = createDb()
    seedStep(db, 'step-1')
    const result = renderPrompt(PROMPTS_PATH, db, 'implementation-design', {
      stepId: 'step-1',
    })
    expect(result.promptKey).toBe('implementation-design')
    expect(result.messages[1].content).toContain('Generate HLD and LLD')
  })

  test('throws when context missing for project-context-update', () => {
    writePrompts()
    const db = createDb()
    expect(() => renderPrompt(PROMPTS_PATH, db, 'project-context-update', {})).toThrow(
      /context is required/,
    )
  })
})

describe('completePrompt', () => {
  test('marks prompt run completed', () => {
    const db = createDb()
    db.run(
      "INSERT INTO prompt_runs (id, step_id, prompt_key, prompt_version, input_context, status) VALUES ('pr-test', NULL, 'step-gen', 1, '{}', 'created')",
    )
    const result = completePrompt(db, 'pr-test', {
      status: 'completed',
      outputRef: 'llm:response',
    })
    expect(result.status).toBe('completed')
    expect(result.outputRef).toBe('llm:response')
  })

  test('throws for invalid status', () => {
    const db = createDb()
    db.run(
      "INSERT INTO prompt_runs (id, step_id, prompt_key, prompt_version, input_context, status) VALUES ('pr-test', NULL, 'step-gen', 1, '{}', 'created')",
    )
    expect(() => completePrompt(db, 'pr-test', { status: 'invalid' })).toThrow(
      /status must be completed or failed/,
    )
  })

  test('marks prompt run failed', () => {
    const db = createDb()
    db.run(
      "INSERT INTO prompt_runs (id, step_id, prompt_key, prompt_version, input_context, status) VALUES ('pr-fail', NULL, 'step-gen', 1, '{}', 'created')",
    )
    const result = completePrompt(db, 'pr-fail', {
      status: 'failed',
      outputRef: 'LLM error: timeout',
    })
    expect(result.status).toBe('failed')
    expect(result.outputRef).toBe('LLM error: timeout')
  })

  test('throws for non-existent run', () => {
    const db = createDb()
    expect(() => completePrompt(db, 'pr-nonexistent', { status: 'completed' })).toThrow(/not found/)
  })
})

describe('requirePromptRun', () => {
  test('succeeds when prompt run exists for step', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO prompt_runs (id, step_id, prompt_key, prompt_version, input_context, status) VALUES ('pr-1', 'step-1', 'test', 1, '{}', 'created')",
    )
    expect(() => requirePromptRun(db, 'pr-1', 'step-1')).not.toThrow()
  })

  test('succeeds when prompt run has no step_id', () => {
    const db = createDb()
    db.run(
      "INSERT INTO prompt_runs (id, step_id, prompt_key, prompt_version, input_context, status) VALUES ('pr-1', NULL, 'test', 1, '{}', 'created')",
    )
    expect(() => requirePromptRun(db, 'pr-1', 'step-1')).not.toThrow()
  })

  test('throws when prompt run belongs to different step', () => {
    const db = createDb()
    seedStep(db, 'step-2')
    db.run(
      "INSERT INTO prompt_runs (id, step_id, prompt_key, prompt_version, input_context, status) VALUES ('pr-1', 'step-2', 'test', 1, '{}', 'created')",
    )
    expect(() => requirePromptRun(db, 'pr-1', 'step-1')).toThrow()
  })

  test('throws for non-existent prompt run', () => {
    const db = createDb()
    expect(() => requirePromptRun(db, 'pr-nonexistent', 'step-1')).toThrow(/not found/)
  })
})

describe('normalizeScenarios', () => {
  test('normalizes valid scenarios', () => {
    const result = normalizeScenarios([
      {
        title: 'User can login',
        expected_result: 'Login succeeds',
        priority: 'high',
        category: 'functional',
        preconditions: ['User exists'],
        steps: ['Enter credentials'],
        coverage_tags: ['auth'],
      },
    ])
    expect(result.length).toBe(1)
    expect(result[0].title).toBe('User can login')
    expect(result[0].expected).toBe('Login succeeds')
    expect(result[0].priority).toBe('high')
  })

  test('defaults missing priority to medium', () => {
    const result = normalizeScenarios([{ title: 'Test', expected_result: 'OK' }])
    expect(result[0].priority).toBe('medium')
  })

  test('throws when title is missing', () => {
    expect(() => normalizeScenarios([{ expected_result: 'OK' }])).toThrow(/title/)
  })

  test('throws when expected_result is missing', () => {
    expect(() => normalizeScenarios([{ title: 'Test' }])).toThrow(/expected_result/)
  })

  test('serializes array fields as JSON', () => {
    const result = normalizeScenarios([
      {
        title: 'Test',
        expected_result: 'OK',
        preconditions: ['a', 'b'],
        steps: ['1', '2'],
        coverage_tags: ['tag'],
      },
    ])
    expect(JSON.parse(result[0].preconditions)).toEqual(['a', 'b'])
    expect(JSON.parse(result[0].steps)).toEqual(['1', '2'])
    expect(JSON.parse(result[0].coverageTags)).toEqual(['tag'])
  })

  test('truncates title longer than max length', () => {
    const longTitle = 'a'.repeat(200)
    const result = normalizeScenarios([
      { title: longTitle, expected_result: 'OK' },
    ])
    expect(result[0].title.length).toBe(150)
  })

  test('truncates expected_result longer than max length', () => {
    const longExpected = 'b'.repeat(600)
    const result = normalizeScenarios([
      { title: 'Test', expected_result: longExpected },
    ])
    expect(result[0].expected.length).toBe(500)
  })

  test('truncates automation_notes longer than max length', () => {
    const longNotes = 'c'.repeat(400)
    const result = normalizeScenarios([
      { title: 'Test', expected_result: 'OK', automation_notes: longNotes },
    ])
    expect(result[0].automationNotes.length).toBe(300)
  })

  test('defaults invalid category to functional', () => {
    const result = normalizeScenarios([
      { title: 'Test', expected_result: 'OK', category: 'invalid-category' },
    ])
    expect(result[0].category).toBe('functional')
  })

  test('accepts valid category values', () => {
    for (const cat of ['functional', 'integration', 'security', 'performance', 'usability', 'error', 'edge']) {
      const result = normalizeScenarios([
        { title: 'Test', expected_result: 'OK', category: cat },
      ])
      expect(result[0].category).toBe(cat)
    }
  })
})
