import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { RequestHandler } from '@sveltejs/kit';
import { createResponse } from '$lib';
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
  const { messages, settings } = await request.json();
  if (settings.aiInferenceType === 'LM Studio') {
      const result = streamText({
      model: lmstudio(settings.aiModel),
      messages,
    });
    return  result.toDataStreamResponse();
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
  return createResponse('Error during inference', 400);
}) satisfies RequestHandler;