import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { RequestHandler } from '@sveltejs/kit';
import { createGenerationError, createResponse, errors } from '$lib';
import { SECRET_GEMINI_API_KEY, SECRET_GROQ_API_KEY } from '$env/static/private';

const lmstudio = createOpenAI({
  name: 'lmstudio',
  baseURL: 'http://localhost:1234/v1',
  apiKey: 'not required',
});

const groq = createGroq({
  apiKey: SECRET_GROQ_API_KEY,
});

const gemini = createGoogleGenerativeAI({
  apiKey: SECRET_GEMINI_API_KEY,
});

export const POST = (async ({ request }) => {
  try {
    const { messages, settings } = await request.json();
    if (settings.aiInferenceType === 'LM Studio') {
        // Check if the server is up and running
        const response = await fetch('http://localhost:1234/v1/models');
        if (!response.ok) {
          throw createGenerationError('LM Studio server is not running.');
        }
        const result = streamText({
        model: lmstudio(settings.aiModel),
        messages,
      });
      return result.toDataStreamResponse();
    }
    if (settings.aiInferenceType === 'Groq') {
      const result = streamText({
        model: groq(settings.aiModel),
        messages,
      });
      return result.toDataStreamResponse();
    }
    if (settings.aiInferenceType === 'Gemini') {
      const result = streamText({
        model: gemini(`models/${settings.aiModel}`),
        messages,
      });
      return result.toDataStreamResponse();
    }
    throw createGenerationError(errors.invalidAiInferenceType);
  } catch (error: any) {
    return createResponse(error.message || errors.unknownError, error.code || 500);
  }
}) satisfies RequestHandler;