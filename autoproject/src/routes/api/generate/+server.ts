import type { RequestHandler } from '@sveltejs/kit'
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { createValidationError, errors } from '$lib'
import { handleAIInference, handleGeminiInference, handleGroqInference } from '../../../lib/services/generate'
import { createResponse, validateAndParseToProjectDetails } from '$lib/utils/helper'
import { CONFIG, GROQ_API_ENDPOINT, LM_STUDIO_SERVER } from '$lib/utils/config'
import { SECRET_GEMINI_API_KEY, SECRET_GROQ_API_KEY } from '$env/static/private'
import { ADD_NEW_FEATURE_TO_EXISTING_PROJECT, RESEARCH_USER_STORY_PROMPT, USER_STORY_PROMPT } from '$lib/services/prompts'
import { appState } from '$lib/state.svelte'

let genAI: GoogleGenerativeAI | undefined, geminiModel: GenerativeModel

const commonHeaders = CONFIG.headers.common
const groqHeaders = CONFIG.headers.groq(SECRET_GROQ_API_KEY ?? '')

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { prd, settings, isJsonMode, jsonSchema } = await request.json()

        if (!prd) {
            throw createValidationError('Missing required field: prd')
        }

        const getPrompt = () => {
            if (appState.activeProject.name) {
                return `${prd} ${ADD_NEW_FEATURE_TO_EXISTING_PROJECT(settings.userStoryType)}`
            }
            
            const promptType = settings.userStoryType === 'Research' 
                ? RESEARCH_USER_STORY_PROMPT 
                : USER_STORY_PROMPT
                
            return `${prd} ${promptType(settings.userStoryType)}`
        }

        const prompt = getPrompt()

        let result
        switch (settings.aiInferenceType) {
            case 'LM Studio':
                result = await handleAIInference(
                    LM_STUDIO_SERVER, 
                    commonHeaders,
                    `LM Studio Community/${settings.aiModel}`,
                    prompt,
                    isJsonMode,
                    jsonSchema,
                )
                break
            case 'Groq':
                if (!SECRET_GROQ_API_KEY) {
                    throw new Error(errors.groqApiNotConfigured)
                }
                result = await handleGroqInference(
                    GROQ_API_ENDPOINT, 
                    groqHeaders, 
                    prompt,
                    settings.aiModel, 
                    isJsonMode
                )
                break
            case 'Gemini':
                if (!genAI) {
                    if (!SECRET_GEMINI_API_KEY) {
                        throw new Error(errors.geminiApiNotConfigured)
                    }
                    genAI = new GoogleGenerativeAI(SECRET_GEMINI_API_KEY)
                    geminiModel = genAI.getGenerativeModel({ 
                        model: settings.aiModel,
                        generationConfig: {
                            responseMimeType: isJsonMode ? "application/json" : "application/text",
                        }
                    })
                }
                result = await handleGeminiInference(geminiModel, prompt)
                break
            default:
                throw new Error(errors.invalidAiInferenceType)
        }

        return createResponse(validateAndParseToProjectDetails(result), 200)

    } catch (error: any) {
        return createResponse(error.message || errors.unknownError, error.code || 500)
    }
}
