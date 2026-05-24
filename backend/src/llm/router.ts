import { Hono } from 'hono'
import type { AppVariables } from '../shared/types'
import { llmClient } from './client'
import { autoProjectService } from '../workflow-engine/service'
import { invalid } from '../shared/errors'
import { ok, readBody } from '../shared/response'

export const llmRouter = new Hono<{ Variables: AppVariables }>()

llmRouter.post('/chat', async (c) => {
  const body = await readBody(c)

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0)
    throw invalid('messages must be a non-empty array')

  const result = await llmClient.chat(body as never)

  return ok(c, result)
})

llmRouter.post('/execute', async (c) => {
  const body: Record<string, unknown> = await readBody(c)

  if (!body.promptKey) throw invalid('promptKey is required')

  const NO_STEPID_KEYS = new Set(['step-generation', 'project-context-update'])
  if (!NO_STEPID_KEYS.has(body.promptKey as string) && !body.stepId)
    throw invalid('stepId is required for this prompt key')

  const render = autoProjectService.renderPrompt(body.promptKey as string, {
    stepId: body.stepId as string | undefined,
    context: body.context as string | undefined,
  })

  let result
  try {
    const passthroughKeys = Object.fromEntries(
      Object.entries(body).filter(([k]) => !['promptKey', 'stepId', 'context', 'llm'].includes(k)),
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

  return ok(
    c,
    {
      runId: render.runId,
      promptKey: render.promptKey,
      content: result.content,
      model: result.model,
      usage: result.usage,
    },
    201,
  )
})
