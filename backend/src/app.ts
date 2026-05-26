import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ApiError, invalid } from './shared/errors'
import { ok, readBody } from './shared/response'
import type { AppVariables } from './shared/types'
import { autoProjectService } from './workflow-engine/service'
import { llmRouter } from './llm/router'

export const app = new Hono<{ Variables: AppVariables }>()

app.use('*', cors())
app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  await next()
})

/**
 * Global error handler.
 *
 * Normalises three error shapes into a consistent JSON envelope:
 * - `{@link ApiError}` → uses its `.code` / `.status` directly
 * - LLM errors (objects with `status` 400–599) → `LLM_ERROR` or their `.code`
 * - Everything else → 500 `INTERNAL`
 *
 * Every response includes the `requestId` set by the middleware.
 */
app.onError((err, c) => {
  const requestId = c.get('requestId')
  if (err instanceof ApiError) {
    return c.json(
      { success: false, error: { code: err.code, message: err.message }, requestId },
      err.status as never,
    )
  }
  const llmErr = err as Error & { status?: number; code?: string }
  if (llmErr.status && llmErr.status >= 400 && llmErr.status < 600) {
    return c.json(
      {
        success: false,
        error: { code: llmErr.code || 'LLM_ERROR', message: llmErr.message },
        requestId,
      },
      llmErr.status as never,
    )
  }
  return c.json(
    {
      success: false,
      error: { code: 'INTERNAL', message: err instanceof Error ? err.message : String(err) },
      requestId,
    },
    500,
  )
})

app.get('/health', (c) => ok(c, { status: 'ok' }))

app.post('/api/init', (c) => ok(c, autoProjectService.init(), 201))
app.post('/api/seed', async (c) => ok(c, autoProjectService.seed(await readBody(c)), 201))

app.get('/api/project/status', (c) => ok(c, autoProjectService.projectStatus()))
app.get('/api/project/validate', (c) => ok(c, autoProjectService.validateProject()))
app.get('/api/project/context', (c) => ok(c, autoProjectService.getProjectContext()))
app.post('/api/project/context', async (c) => {
  const body = await readBody(c)
  if (!body.content) throw invalid('content is required')
  return ok(c, autoProjectService.updateProjectContext(String(body.content)), 200)
})

app.get('/api/worklog', (c) => ok(c, autoProjectService.worklog()))
app.get('/api/steps/:stepId/worklog', (c) =>
  ok(c, autoProjectService.worklog(c.req.param('stepId'))),
)

app.get('/api/steps', (c) => ok(c, autoProjectService.listSteps()))
app.get('/api/steps/current', (c) => ok(c, autoProjectService.currentStep()))
app.get('/api/steps/:stepId', (c) => ok(c, autoProjectService.getStep(c.req.param('stepId'))))
app.post('/api/steps', async (c) => ok(c, autoProjectService.createStep(await readBody(c)), 201))
app.post('/api/steps/import', async (c) =>
  ok(c, autoProjectService.importSteps(await readBody(c)), 201),
)
app.patch('/api/steps/:stepId', async (c) =>
  ok(c, autoProjectService.updateStep(c.req.param('stepId'), await readBody(c))),
)
app.delete('/api/steps/:stepId', (c) => ok(c, autoProjectService.deleteStep(c.req.param('stepId'))))
app.post('/api/steps/:stepId/actions/:action', (c) =>
  ok(c, autoProjectService.stepAction(c.req.param('stepId'), c.req.param('action'))),
)

app.get('/api/requirements', (c) => ok(c, autoProjectService.listRequirements()))
app.post('/api/requirements', async (c) =>
  ok(c, autoProjectService.addRequirement(await readBody(c)), 201),
)

app.get('/api/prompts', (c) => ok(c, autoProjectService.listPrompts()))
app.post('/api/prompts/:promptKey/render', async (c) =>
  ok(c, autoProjectService.renderPrompt(c.req.param('promptKey'), await readBody(c)), 201),
)
app.post('/api/prompt-runs/:runId/complete', async (c) =>
  ok(c, autoProjectService.completePrompt(c.req.param('runId'), await readBody(c))),
)

app.get('/api/steps/:stepId/scenarios', (c) =>
  ok(c, autoProjectService.listScenarios(c.req.param('stepId'))),
)
app.post('/api/steps/:stepId/scenarios/import', async (c) =>
  ok(c, autoProjectService.importScenarios(c.req.param('stepId'), await readBody(c)), 201),
)
app.patch('/api/scenarios/:scenarioId/status', async (c) =>
  ok(c, autoProjectService.updateScenarioStatus(c.req.param('scenarioId'), await readBody(c))),
)

app.get('/api/steps/:stepId/design', (c) =>
  ok(c, autoProjectService.getDesign(c.req.param('stepId'))),
)
app.post('/api/steps/:stepId/design/import', async (c) =>
  ok(c, autoProjectService.importDesign(c.req.param('stepId'), await readBody(c)), 201),
)

app.get('/api/test-suites', (c) => ok(c, autoProjectService.testSuiteStatus()))
app.get('/api/test-suites/:suiteId', (c) =>
  ok(c, autoProjectService.testSuiteStatus(c.req.param('suiteId'))),
)
app.post('/api/steps/:stepId/test-suites', async (c) =>
  ok(c, autoProjectService.createTestSuite(c.req.param('stepId'), await readBody(c)), 201),
)
app.post('/api/test-suites/:suiteId/run', (c) =>
  ok(c, autoProjectService.runTestSuite(c.req.param('suiteId'))),
)

app.get('/api/quality-gates', (c) => ok(c, autoProjectService.qualityGateStatus()))
app.get('/api/steps/:stepId/quality-gates', (c) =>
  ok(c, autoProjectService.qualityGateStatus(c.req.param('stepId'))),
)
app.post('/api/steps/:stepId/quality-gates/run', async (c) =>
  ok(c, await autoProjectService.runQualityGates(c.req.param('stepId'))),
)

app.post('/api/onboard', async (c) => ok(c, autoProjectService.onboard(await readBody(c)), 201))

app.route('/api/llm', llmRouter)
