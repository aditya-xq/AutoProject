import type { RequestHandler } from '@sveltejs/kit';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LM_STUDIO_SERVER, GROQ_API_ENDPOINT, createResponse } from '$lib';
import { handleAIInference, handleGeminiProInference } from '$lib/generate';

// API clients lazy initialization
let genAI: GoogleGenerativeAI | undefined, geminiProModel: GenerativeModel;

// Headers configuration
const commonHeaders = { 'Content-Type': 'application/json' };
const groqHeaders = () => ({
    "Authorization": `Bearer ${process.env.VITE_GROQ_API_KEY}`,
    "Content-Type": "application/json"
});

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { prd, requirements, settings } = body;

        if (prd && requirements) {
            return createResponse("Ambiguous request: Both prd and requirements present", 400);
        }

        let content, promptType, response;
        if (prd) {
            content = prd;
            promptType = 'UserStory';
        } else if (requirements) {
            content = requirements;
            promptType = 'PRD';
        } else {
            return createResponse("Invalid request: Neither prd nor requirements provided", 400);
        }

        switch (settings.aiInferenceType) {
            case 'LM Studio':
                response = await handleAIInference(LM_STUDIO_SERVER, commonHeaders, `LM Studio Community/${settings.aiModel}`, content, promptType, settings);
                return createResponse(response, 200);
            case 'Groq':
                if (!process.env.VITE_GROQ_API_KEY) {
                    throw new Error('Groq API key not configured.');
                }
                response = await handleAIInference(GROQ_API_ENDPOINT, groqHeaders(), settings.aiModel, content, promptType, settings);
                return createResponse(response, 200);
            case 'Gemini Pro':
                if (!genAI) {
                    if (!process.env.VITE_GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
                    genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
                    geminiProModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
                }
                response = await handleGeminiProInference(geminiProModel, content, promptType, settings);
                return createResponse(response, response.status);
            default:
                return createResponse("Invalid AI inference model", 400);
        }
    } catch (error: any) {
        console.error("Server error: ", error);
        return createResponse(`Server error: ${error.message}`, 500);
    }
};
