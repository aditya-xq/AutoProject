import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGroq } from '@ai-sdk/groq'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { RequestHandler } from '@sveltejs/kit'
import { createGenerationError, errors } from '$lib'
import { env } from '$env/dynamic/private'
import { LM_STUDIO_SERVER } from '$lib/server/config'

export const POST = (async ({ request }) => {
  const lmstudio = createOpenAI({
    name: 'lmstudio',
    baseURL: `${LM_STUDIO_SERVER}/v1`,
    apiKey: 'not required',
  })

  const groq = createGroq({
    apiKey: env.SECRET_GROQ_API_KEY,
  })
  
  const gemini = createGoogleGenerativeAI({
    apiKey: env.SECRET_GEMINI_API_KEY,
  })
  try {
    const { settings, prompt }: { settings: any, prompt: any} = await request.json()
    if (settings.aiInferenceType === 'LM Studio') {
        // Check if the server is up and running
        const response = await fetch(`${LM_STUDIO_SERVER}/v1/models`)
        if (!response.ok) {
          throw createGenerationError('LM Studio server is not running.')
        }
        const result = streamText({
        model: lmstudio(settings.aiModel),
        prompt: prompt
      })
      return result.toUIMessageStreamResponse()
    }
    if (settings.aiInferenceType === 'Groq') {
      const result = streamText({
        model: groq(settings.aiModel),
        prompt: prompt
      })
      return result.toUIMessageStreamResponse()
    }
    if (settings.aiInferenceType === 'Gemini') {
      const result = streamText({
        model: gemini(`models/${settings.aiModel}`),
        prompt: prompt
      })
      return result.toUIMessageStreamResponse()
    }
    throw createGenerationError(errors.invalidAiInferenceType)
  } catch (error: any) {
    throw createGenerationError(error.message || errors.unknownError)
  }
}) satisfies RequestHandler
