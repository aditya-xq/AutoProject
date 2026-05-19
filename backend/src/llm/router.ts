import { Hono } from 'hono'
import { llmClient } from './client'
import { autoProjectService } from '../autoproject/service'
import { invalid, notFound } from '../autoproject/errors'

type Variables = { requestId: string }

export const llmRouter = new Hono<{ Variables: Variables }>()

function handleRenderError(e: unknown): never {
  if (e instanceof Error) {
    if ('code' in e && e.code === 'NOT_FOUND') {
      throw notFound(e.message)
    }
    throw e
  }
  throw e
}

llmRouter.post('/chat', async (c) => {
  const contentType = c.req.header('content-type') || ''
  const body =
    contentType.includes('application/json') ? await c.req.json().catch(() => ({})) : {}

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0)
    throw invalid('messages must be a non-empty array')

  const result = await llmClient.chat(body)

  return c.json(
    { success: true, data: result, requestId: c.get('requestId') },
    200,
  )
})

llmRouter.post('/execute', async (c) => {
  const contentType = c.req.header('content-type') || ''
  const body: Record<string, unknown> =
    contentType.includes('application/json') ? await c.req.json().catch(() => ({})) : {}

  if (!body.promptKey) throw invalid('promptKey is required')

  const NO_STEPID_KEYS = ['step-generation']
  if (!NO_STEPID_KEYS.includes(body.promptKey as string) && !body.stepId)
    throw invalid('stepId is required for this prompt key')

  let render: { runId: string; promptKey: string; messages: unknown[] }
  try {
    render = autoProjectService.renderPrompt(body.promptKey as string, {
      stepId: body.stepId as string | undefined,
      context: body.context as string | undefined,
    })
  } catch (e) {
    handleRenderError(e)
  }

  let result
  try {
    const passthroughKeys = Object.fromEntries(
      Object.entries(body).filter(
        ([k]) => !['promptKey', 'stepId', 'context', 'llm'].includes(k),
      ),
    )
    const llmOptions = { ...(body.llm as Record<string, unknown> | undefined), ...passthroughKeys }
    result = await llmClient.chat({
      ...llmOptions,
      messages: render.messages as never[],
      max_tokens: (llmOptions.max_tokens as number | undefined) ?? 1024,
    })
  } catch (e) {
    autoProjectService.completePrompt(render.runId, {
      status: 'failed',
      outputRef: e instanceof Error ? e.message : String(e),
    })
    throw e
  }

  autoProjectService.completePrompt(render.runId, {
    status: 'completed',
    outputRef: result.content,
  })

  return c.json(
    {
      success: true,
      data: {
        runId: render.runId,
        promptKey: render.promptKey,
        content: result.content,
        model: result.model,
        usage: result.usage,
      },
      requestId: c.get('requestId'),
    },
    201,
  )
})
