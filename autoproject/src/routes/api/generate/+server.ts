import type { RequestHandler } from '@sveltejs/kit';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LM_STUDIO_SERVER, GROQ_API_ENDPOINT, createResponse } from '$lib';
import { handleAIInference, handleGeminiInference } from '../../../lib/services/generate';
import { CONFIG } from '$lib/utils/config';
import { SECRET_GEMINI_API_KEY, SECRET_GROQ_API_KEY } from '$env/static/private';

// API clients lazy initialization
let genAI: GoogleGenerativeAI | undefined, geminiModel: GenerativeModel;

// Headers configuration
const commonHeaders = CONFIG.headers.common;
const groqHeaders = CONFIG.headers.groq(SECRET_GROQ_API_KEY ?? '');

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { prd, settings, promptType } = body;

        let content, response;
        if (prd) {
            content = prd;
        } else {
            return createResponse("Invalid request: PRD is not provided", 400);
        }

        switch (settings.aiInferenceType) {
            case 'LM Studio':
                response = await handleAIInference(LM_STUDIO_SERVER, commonHeaders, `LM Studio Community/${settings.aiModel}`, content, promptType, settings);
                return createResponse(response, 200);
            case 'Groq':
                if (!SECRET_GROQ_API_KEY) {
                    throw new Error('Groq API key not configured.');
                }
                response = await handleAIInference(GROQ_API_ENDPOINT, groqHeaders, settings.aiModel, content, promptType, settings);
                return createResponse(response, 200);
            case 'Gemini':
                if (!genAI) {
                    if (!SECRET_GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
                    genAI = new GoogleGenerativeAI(SECRET_GEMINI_API_KEY);
                    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                }
                response = await handleGeminiInference(geminiModel, content, promptType, settings);
                return createResponse(response, response.status);
            default:
                return createResponse("Invalid AI inference model", 400);
        }
    } catch (error: any) {
        console.error("Server error: ", error);
        return createResponse(`Server error: ${error.message}`, 500);
    }
};
