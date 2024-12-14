import type { RequestHandler } from '@sveltejs/kit';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LM_STUDIO_SERVER, GROQ_API_ENDPOINT, createValidationError, errors } from '$lib';
import { handleAIInference, handleGeminiInference } from '../../../lib/services/generate';
import { createResponse } from '$lib/utils/helper';
import { CONFIG } from '$lib/utils/config';
import { SECRET_GEMINI_API_KEY, SECRET_GROQ_API_KEY } from '$env/static/private';

let genAI: GoogleGenerativeAI | undefined, geminiModel: GenerativeModel;

const commonHeaders = CONFIG.headers.common;
const groqHeaders = CONFIG.headers.groq(SECRET_GROQ_API_KEY ?? '');

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { prd, settings, promptType } = await request.json();

        if (!prd) {
            throw createValidationError('Missing required field: prd');
        }

        let result;
        switch (settings.aiInferenceType) {
            case 'LM Studio':
                result = await handleAIInference(
                    LM_STUDIO_SERVER, 
                    commonHeaders, 
                    `LM Studio Community/${settings.aiModel}`, 
                    prd, 
                    promptType, 
                    settings
                );
                break;
            case 'Groq':
                if (!SECRET_GROQ_API_KEY) {
                    throw new Error(errors.groqApiNotConfigured);
                }
                result = await handleAIInference(
                    GROQ_API_ENDPOINT, 
                    groqHeaders, 
                    settings.aiModel, 
                    prd, 
                    promptType, 
                    settings
                );
                break;
            case 'Gemini':
                if (!genAI) {
                    if (!SECRET_GEMINI_API_KEY) {
                        throw new Error(errors.geminiApiNotConfigured);
                    }
                    genAI = new GoogleGenerativeAI(SECRET_GEMINI_API_KEY);
                    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                }
                result = await handleGeminiInference(geminiModel, prd, promptType, settings);
                break;
            default:
                throw new Error(errors.invalidAiInferenceType);
        }

        return createResponse(result, 200);

    } catch (error: any) {
        return createResponse(error.message || errors.unknownError, error.code || 500);
    }
}
