import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import {
  TRANSITIONS,
  ACTIVE_STEP_STATUSES,
  PLAN_VISIBLE_STATUSES,
  REQUIRED_QUALITY_GATES,
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
} from '../workflow'
import { initializeDatabase } from '../database'
import type { StepRow } from '../database'
import { stepIdFor, normalizeStringArray, requireNonEmpty } from '../../shared/validation'

function createDb(): Database {
  const db = new Database(':memory:')
  initializeDatabase(db)
  return db
}

function seedStep(db: Database, id = 'step-1'): StepRow {
  db.run(
    "INSERT INTO steps (id, step_number, title, objective, sort_order, status) VALUES (?, ?, ?, ?, ?, 'pending')",
    [id, id === 'step-1' ? '1' : '2', 'Test Step', 'Test objective', 0],
  )
  return db.query('SELECT * FROM steps WHERE id = ?').get(id) as StepRow
}

function setDep(db: Database, stepId: string, dependsOn: string): void {
  db.run('UPDATE steps SET depends_on_step_id = ? WHERE id = ?', [dependsOn, stepId])
}

describe('TRANSITIONS', () => {
  test('has valid state machine entries', () => {
    expect(TRANSITIONS.pending).toEqual({ start: 'in_progress', skip: 'skipped' })
    expect(TRANSITIONS.in_progress).toEqual({
      'scenarios-generated': 'scenarios_generated',
      fail: 'failed',
    })
    expect(TRANSITIONS.completed).toEqual({})
    expect(TRANSITIONS.skipped).toEqual({})
  })
  test('ACTIVE_STEP_STATUSES contains non-terminal states', () => {
    expect(ACTIVE_STEP_STATUSES).toContain('in_progress')
    expect(ACTIVE_STEP_STATUSES).not.toContain('completed')
  })
  test('PLAN_VISIBLE_STATUSES hides implementation_plan for early steps', () => {
    expect(PLAN_VISIBLE_STATUSES.has('tests_built')).toBe(true)
    expect(PLAN_VISIBLE_STATUSES.has('pending')).toBe(false)
  })
  test('REQUIRED_QUALITY_GATES lists all gates', () => {
    expect(REQUIRED_QUALITY_GATES).toEqual(['lint', 'typecheck', 'test', 'build'])
  })
})

describe('validateTransition', () => {
  const baseStep: StepRow = {
    id: 'step-1',
    step_number: '1',
    title: 'Test',
    objective: 'Test',
    context: '',
    test_suite: '',
    implementation_plan: '',
    validation: '',
    status: 'pending',
    sort_order: 0,
    depends_on_step_id: null,
    created_at: '',
    updated_at: '',
  }

  test('valid transition returns target status', () => {
    expect(validateTransition({ ...baseStep, status: 'pending' }, 'start')).toBe('in_progress')
    expect(validateTransition({ ...baseStep, status: 'in_progress' }, 'fail')).toBe('failed')
  })

  test('invalid transition throws with message', () => {
    expect(() => validateTransition({ ...baseStep, status: 'pending' }, 'complete')).toThrow(
      "Cannot 'complete' from 'pending'",
    )
  })

  test('terminal states accept no actions', () => {
    expect(() => validateTransition({ ...baseStep, status: 'completed' }, 'start')).toThrow(
      "Cannot 'start' from 'completed'",
    )
  })

  test('failed to retry transition', () => {
    expect(validateTransition({ ...baseStep, status: 'failed' }, 'retry')).toBe('in_progress')
  })

  test('failed to skip transition', () => {
    expect(validateTransition({ ...baseStep, status: 'failed' }, 'skip')).toBe('skipped')
  })

  test('skipped state accepts no actions', () => {
    expect(() => validateTransition({ ...baseStep, status: 'skipped' }, 'start')).toThrow(
      "Cannot 'start' from 'skipped'",
    )
  })
})

describe('gatePlan', () => {
  function makeStep(implPlan: string, status: string): StepRow {
    return {
      id: 'step-1',
      step_number: '1',
      title: 'Test',
      objective: 'Test',
      context: '',
      test_suite: '',
      implementation_plan: implPlan,
      validation: '',
      status: status as StepRow['status'],
      sort_order: 0,
      depends_on_step_id: null,
      created_at: '',
      updated_at: '',
    }
  }
  test('clears for non-visible', () =>
    expect(gatePlan(makeStep('secret', 'pending')).implementation_plan).toBe(''))
  test('preserves for visible', () =>
    expect(gatePlan(makeStep('visible', 'tests_built')).implementation_plan).toBe('visible'))
  test('does not mutate the original row', () => {
    const step = makeStep('secret', 'pending')
    expect(gatePlan(step)).not.toBe(step)
    expect(step.implementation_plan).toBe('secret')
  })
})

describe('assertCanStart', () => {
  test('throws when database has no steps', () => {
    const db = createDb()
    expect(() => assertCanStart(db, 'step-1')).toThrow(/No steps in database/)
  })

  test('succeeds when no active steps and step is first eligible', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => assertCanStart(db, 'step-1')).not.toThrow()
  })
  test('throws when another step is active', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    db.run("UPDATE steps SET status = 'in_progress' WHERE id = 'step-2'")
    expect(() => assertCanStart(db, 'step-1')).toThrow("Active step is 'step-2'")
  })
  test('throws when step is not the next eligible', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    expect(() => assertCanStart(db, 'step-2')).toThrow("Current step is 'step-1'")
  })
  test('throws when no pending steps are eligible', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    db.run("UPDATE steps SET status = 'skipped' WHERE id = 'step-1'")
    setDep(db, 'step-2', 'step-1')
    expect(() => assertCanStart(db, 'step-2')).toThrow(/dependencies may be blocking/i)
  })
})

describe('assertScenarioReady', () => {
  test('throws when no scenarios exist', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => assertScenarioReady(db, 'step-1')).toThrow(/generated test scenarios/i)
  })
  test('succeeds when scenarios exist', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_scenarios (id, step_id, title, expected_result) VALUES ('sc-1', 'step-1', 'Test', 'OK')",
    )
    expect(() => assertScenarioReady(db, 'step-1')).not.toThrow()
  })
})

describe('assertDesignReady', () => {
  test('throws when no HLD or LLD exist', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => assertDesignReady(db, 'step-1')).toThrow(/approved HLD and LLD/i)
  })
  test('throws when only HLD exists', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-1', 'step-1', 'hld', '{}', 'approved')",
    )
    expect(() => assertDesignReady(db, 'step-1')).toThrow(/approved HLD and LLD/i)
  })
  test('throws when designs exist but are not approved', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-1', 'step-1', 'hld', '{}', 'draft')",
    )
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-2', 'step-1', 'lld', '{}', 'draft')",
    )
    expect(() => assertDesignReady(db, 'step-1')).toThrow(/approved HLD and LLD/i)
  })
  test('succeeds when both exist', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-1', 'step-1', 'hld', '{}', 'approved')",
    )
    db.run(
      "INSERT INTO design_artifacts (id, step_id, artifact_type, content, status) VALUES ('da-2', 'step-1', 'lld', '{}', 'approved')",
    )
    expect(() => assertDesignReady(db, 'step-1')).not.toThrow()
  })
})

describe('assertTestsReady', () => {
  test('throws when no test suites exist', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => assertTestsReady(db, 'step-1')).toThrow(/create at least one test suite/i)
  })
  test('throws when scenarios are still proposed', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns) VALUES ('ts-1', 'step-1', 'Tests', '[]')",
    )
    db.run(
      "INSERT INTO test_scenarios (id, step_id, title, expected_result, status) VALUES ('sc-1', 'step-1', 'Test', 'OK', 'proposed')",
    )
    expect(() => assertTestsReady(db, 'step-1')).toThrow(/automated.*before/i)
  })
  test('succeeds when suites exist and scenarios are automated', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns) VALUES ('ts-1', 'step-1', 'Tests', '[]')",
    )
    db.run(
      "INSERT INTO test_scenarios (id, step_id, title, expected_result, status) VALUES ('sc-1', 'step-1', 'Test', 'OK', 'automated')",
    )
    expect(() => assertTestsReady(db, 'step-1')).not.toThrow()
  })

  test('succeeds when scenarios have non-proposed statuses', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run(
      "INSERT INTO test_suites (id, step_id, name, file_patterns) VALUES ('ts-1', 'step-1', 'Tests', '[]')",
    )
    for (const status of ['passing', 'failing', 'deferred']) {
      db.run(
        "INSERT INTO test_scenarios (id, step_id, title, expected_result, status) VALUES (?, 'step-1', 'Test', 'OK', ?)",
        [`sc-${status}`, status],
      )
    }
    expect(() => assertTestsReady(db, 'step-1')).not.toThrow()
  })
})

describe('assertHasWorklog', () => {
  test('throws when worklog entry missing', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => assertHasWorklog(db, 'step-1', 'tests-built', 'Need tests first')).toThrow(
      'Need tests first',
    )
  })
  test('succeeds when worklog entry exists', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run("INSERT INTO worklog (id, step_id, action) VALUES ('wl-1', 'step-1', 'tests-built')")
    expect(() => assertHasWorklog(db, 'step-1', 'tests-built', '')).not.toThrow()
  })
})

describe('assertCanComplete', () => {
  test('throws when no implemented worklog', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(() => assertCanComplete(db, 'step-1')).toThrow(/must implement/i)
  })
  test('throws when no quality gates run', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run("INSERT INTO worklog (id, step_id, action) VALUES ('wl-1', 'step-1', 'implemented')")
    expect(() => assertCanComplete(db, 'step-1')).toThrow(/run all quality gates/i)
  })
  test('succeeds when all conditions met', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run("INSERT INTO worklog (id, step_id, action) VALUES ('wl-1', 'step-1', 'implemented')")
    for (const gate of REQUIRED_QUALITY_GATES) {
      db.run(
        "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES (?, 'step-1', ?, 'pass')",
        [`qg-${gate}`, gate],
      )
    }
    expect(() => assertCanComplete(db, 'step-1')).not.toThrow()
  })

  test('throws when latest quality gate result is error', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run("INSERT INTO worklog (id, step_id, action) VALUES ('wl-1', 'step-1', 'implemented')")
    for (const gate of REQUIRED_QUALITY_GATES) {
      db.run(
        "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES (?, 'step-1', ?, 'pass')",
        [`qg-${gate}`, gate],
      )
    }
    db.run(
      "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES ('qg-lint-2', 'step-1', 'lint', 'error')",
    )
    expect(() => assertCanComplete(db, 'step-1')).toThrow(/quality gate results include failures/i)
  })

  test('throws when only some gates pass', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    db.run("INSERT INTO worklog (id, step_id, action) VALUES ('wl-1', 'step-1', 'implemented')")
    db.run(
      "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES ('qg-lint', 'step-1', 'lint', 'pass')",
    )
    db.run(
      "INSERT INTO quality_gate_runs (id, step_id, gate_name, status) VALUES ('qg-typecheck', 'step-1', 'typecheck', 'fail')",
    )
    expect(() => assertCanComplete(db, 'step-1')).toThrow(/quality gate results include failures/i)
  })
})

describe('getCurrentStep', () => {
  test('returns null when no active steps', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    expect(getCurrentStep(db)).toBeNull()
  })
  test('returns the active step', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    db.run("UPDATE steps SET status = 'in_progress' WHERE id = 'step-2'")
    expect(getCurrentStep(db)?.id).toBe('step-2')
  })

  test('returns first active step by sort_order when multiple are active', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    db.run(
      "INSERT INTO steps (id, step_number, title, objective, sort_order, status) VALUES ('step-3', '3', 'Test Step', 'Test objective', 2, 'pending')",
    )
    db.run("UPDATE steps SET status = 'in_progress' WHERE id = 'step-2'")
    db.run("UPDATE steps SET status = 'scenarios_generated' WHERE id = 'step-3'")
    expect(getCurrentStep(db)?.id).toBe('step-2')
  })
})

describe('getNextPendingStep', () => {
  test('returns null when no steps exist', () => {
    const db = createDb()
    expect(getNextPendingStep(db)).toBeNull()
  })

  test('returns first eligible pending step', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    expect(getNextPendingStep(db)?.id).toBe('step-1')
  })
  test('returns null when all blocked', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    seedStep(db, 'step-2')
    db.run("UPDATE steps SET status = 'skipped' WHERE id = 'step-1'")
    setDep(db, 'step-2', 'step-1')
    expect(getNextPendingStep(db)).toBeNull()
  })
})

describe('getStep', () => {
  test('returns step when found', () => {
    const db = createDb()
    seedStep(db, 'step-1')
    const step = getStep(db, 'step-1')
    expect(step.id).toBe('step-1')
    expect(step.title).toBe('Test Step')
  })
  test('throws when not found', () => {
    const db = createDb()
    expect(() => getStep(db, 'nonexistent')).toThrow("Step 'nonexistent' not found")
  })
})

describe('stepIdFor', () => {
  test('simple number', () => expect(stepIdFor('1')).toBe('step-1'))
  test('dotted number', () => expect(stepIdFor('1.2')).toBe('step-1-2'))
  test('nested number', () => expect(stepIdFor('2.3.4')).toBe('step-2-3-4'))
  test('trims whitespace', () => expect(stepIdFor('  5  ')).toBe('step-5'))
})

describe('normalizeStringArray', () => {
  test('passes through arrays', () => expect(normalizeStringArray(['a', 'b'])).toEqual(['a', 'b']))
  test('wraps non-empty string', () => expect(normalizeStringArray('hello')).toEqual(['hello']))
  test('empty for empty string', () => expect(normalizeStringArray('')).toEqual([]))
  test('empty for null', () => expect(normalizeStringArray(null)).toEqual([]))
  test('empty for undefined', () => expect(normalizeStringArray(undefined)).toEqual([]))
})

describe('requireNonEmpty', () => {
  test('returns trimmed string', () => expect(requireNonEmpty('  hello  ', 'test')).toBe('hello'))
  test('throws for empty', () =>
    expect(() => requireNonEmpty('', 'title')).toThrow('title is required'))
  test('throws for null', () =>
    expect(() => requireNonEmpty(null, 'name')).toThrow('name is required'))
})
