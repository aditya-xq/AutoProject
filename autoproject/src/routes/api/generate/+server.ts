import type { RequestHandler } from '@sveltejs/kit'
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { createValidationError, errors } from '$lib'
import { handleAIInference, handleGeminiInference, handleGroqInference } from '../../../lib/services/generate'
import { createResponse, validateAndParseToProjectDetails } from '$lib/utils/helper'
import { CONFIG, GROQ_API_ENDPOINT, normalizeModelForInference } from '$lib/utils/config'
import { env } from '$env/dynamic/private'
import { ADD_NEW_FEATURE_TO_EXISTING_PROJECT, RESEARCH_USER_STORY_PROMPT, USER_STORY_PROMPT } from '$lib/services/prompts'
import { LM_STUDIO_SERVER } from '$lib/server/config'

let genAI: GoogleGenerativeAI | undefined

export const POST: RequestHandler = async ({ request }) => {
    const commonHeaders = CONFIG.headers.common
    const groqHeaders = CONFIG.headers.groq(env.SECRET_GROQ_API_KEY ?? '')
    try {
        const { prd, settings, isJsonMode, jsonSchema, isExistingProject } = await request.json()

        if (!prd) {
            throw createValidationError('Missing required field: prd')
        }
        if (!settings?.aiInferenceType || !settings?.aiModel || !settings?.userStoryType) {
            throw createValidationError('Missing required settings for generation')
        }

        const modelId = normalizeModelForInference(settings.aiInferenceType, settings.aiModel)

        const getPrompt = () => {
            if (isExistingProject) {
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
                    `${LM_STUDIO_SERVER}/v1/chat/completions`, 
                    commonHeaders,
                    modelId,
                    prompt,
                    isJsonMode,
                    jsonSchema,
                )
                break
            case 'Groq':
                if (!env.SECRET_GROQ_API_KEY) {
                    throw new Error(errors.groqApiNotConfigured)
                }
                result = await handleGroqInference(
                    GROQ_API_ENDPOINT, 
                    groqHeaders, 
                    prompt,
                    modelId, 
                    isJsonMode
                )
                break
            case 'Gemini':
                if (!genAI) {
                    if (!env.SECRET_GEMINI_API_KEY) {
                        throw new Error(errors.geminiApiNotConfigured)
                    }
                    genAI = new GoogleGenerativeAI(env.SECRET_GEMINI_API_KEY)
                }
                const geminiModel: GenerativeModel = genAI.getGenerativeModel({ 
                    model: modelId,
                    generationConfig: {
                        responseMimeType: isJsonMode ? "application/json" : "application/text",
                    }
                })
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
