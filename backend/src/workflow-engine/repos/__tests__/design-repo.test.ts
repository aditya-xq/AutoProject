import { describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'
import { initializeDatabase } from '../../database'
import { clearPromptCache } from '../../prompts'
import {
  importDesignArtifacts,
  queryDesignArtifacts,
} from '../design-repo'

const TEST_ROOT = join(tmpdir(), 'repos-design-test')
const PROMPTS_PATH = join(TEST_ROOT, 'prompts.json')

const SAMPLE_PROMPTS = {
  version: 1,
  prompts: {
    'implementation-design': {
      version: 1,
      purpose: 'Test',
      system: 'You are an architect.',
      output_schema: { type: 'object' },
    },
  },
}

function setupPrompts() {
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

function seedStep(db: Database, id = 'step-1') {
  const sn = id.replace(/^step-/, '')
  db.run(
    "INSERT OR IGNORE INTO steps (id, step_number, title, objective, sort_order) VALUES (?, ?, 'Test', 'Objective', 0)",
    [id, sn],
  )
}

const SAMPLE_HLD = { summary: 'HLD', architecture: ['service-a'], data_flow: [], integration_points: [], risks: [] }
const SAMPLE_LLD = { files: ['src/main.ts'], data_model: [], algorithms: [], implementation_order: [], scenario_mapping: [] }

describe('importDesignArtifacts', () => {
  test('imports HLD and LLD for a step', () => {
    const db = createDb()
    seedStep(db)
    const result = importDesignArtifacts(db, 'step-1', { hld: SAMPLE_HLD, lld: SAMPLE_LLD })
    expect(result.imported).toEqual(['hld', 'lld'])
    expect(result.stepId).toBe('step-1')
  })

  test('persists artifacts in design_artifacts table', () => {
    const db = createDb()
    seedStep(db)
    importDesignArtifacts(db, 'step-1', { hld: SAMPLE_HLD, lld: SAMPLE_LLD })
    const rows = db.query("SELECT artifact_type FROM design_artifacts WHERE step_id = 'step-1' ORDER BY artifact_type").all() as { artifact_type: string }[]
    expect(rows.map((r) => r.artifact_type)).toEqual(['hld', 'lld'])
  })

  test('supersedes previous approved designs', () => {
    const db = createDb()
    seedStep(db)
    importDesignArtifacts(db, 'step-1', { hld: SAMPLE_HLD, lld: SAMPLE_LLD })
    importDesignArtifacts(db, 'step-1', { hld: { ...SAMPLE_HLD, summary: 'v2' }, lld: { ...SAMPLE_LLD, files: ['v2.ts'] } })
    const superseded = db.query("SELECT artifact_type, status FROM design_artifacts WHERE step_id = 'step-1' AND status = 'superseded'").all() as { artifact_type: string; status: string }[]
    expect(superseded.length).toBe(2)
  })

  test('throws when hld or lld missing', () => {
    const db = createDb()
    seedStep(db)
    expect(() => importDesignArtifacts(db, 'step-1', { hld: SAMPLE_HLD } as any)).toThrow(/hld and lld are required/)
    expect(() => importDesignArtifacts(db, 'step-1', { lld: SAMPLE_LLD } as any)).toThrow(/hld and lld are required/)
  })

  test('throws for non-existent step', () => {
    const db = createDb()
    expect(() => importDesignArtifacts(db, 'step-999', { hld: SAMPLE_HLD, lld: SAMPLE_LLD })).toThrow(/not found/)
  })

  test('marks prompt run as completed when promptRunId provided', () => {
    setupPrompts()
    const db = createDb()
    seedStep(db)
    db.run(
      "INSERT INTO prompt_runs (id, step_id, prompt_key, prompt_version, input_context, status) VALUES ('pr-1', 'step-1', 'implementation-design', 1, '{}', 'created')",
    )
    importDesignArtifacts(db, 'step-1', { promptRunId: 'pr-1', hld: SAMPLE_HLD, lld: SAMPLE_LLD })
    const run = db.query('SELECT status, output_ref FROM prompt_runs WHERE id = ?').get('pr-1') as any
    expect(run.status).toBe('completed')
    expect(run.output_ref).toContain('hld,lld')
  })

  test('stores content as JSON string', () => {
    const db = createDb()
    seedStep(db)
    importDesignArtifacts(db, 'step-1', { hld: SAMPLE_HLD, lld: SAMPLE_LLD })
    const row = db.query("SELECT content FROM design_artifacts WHERE artifact_type = 'hld'").get() as { content: string }
    const parsed = JSON.parse(row.content)
    expect(parsed.summary).toBe('HLD')
  })
})

describe('queryDesignArtifacts', () => {
  test('returns empty array when no artifacts exist', () => {
    const db = createDb()
    seedStep(db)
    const result = queryDesignArtifacts(db, 'step-1')
    expect(result.artifacts).toEqual([])
  })

  test('returns only approved artifacts', () => {
    const db = createDb()
    seedStep(db)
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-1', 'step-1', 'hld', '{}', 'draft')",
    )
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-2', 'step-1', 'lld', '{}', 'approved')",
    )
    const result = queryDesignArtifacts(db, 'step-1')
    expect(result.artifacts.length).toBe(1)
    expect((result.artifacts[0] as any).artifact_type).toBe('lld')
  })

  test('throws for non-existent step', () => {
    const db = createDb()
    expect(() => queryDesignArtifacts(db, 'step-999')).toThrow(/not found/)
  })

  test('returns artifacts ordered by artifact_type', () => {
    const db = createDb()
    seedStep(db)
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-1', 'step-1', 'lld', '{}', 'approved')",
    )
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-2', 'step-1', 'hld', '{}', 'approved')",
    )
    const result = queryDesignArtifacts(db, 'step-1')
    expect(result.artifacts.length).toBe(2)
    expect((result.artifacts[0] as any).artifact_type).toBe('hld')
    expect((result.artifacts[1] as any).artifact_type).toBe('lld')
  })
})
