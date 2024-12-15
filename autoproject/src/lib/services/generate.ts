import type { GenerativeModel } from "@google/generative-ai";
import { createGenerationError, errors, validateAndParseToProjectDetails, type Settings } from "$lib";
import { PROJECT_SCHEMA_FOR_LMSTUDIO, SYSTEM_PROMPT } from "$lib/utils/config";
import { USER_STORY_PROMPT } from "./prompts";

export async function handleGeminiInference(
    model: GenerativeModel, 
    content: string, 
    settings: Settings
) {
    const promptSuffix = USER_STORY_PROMPT(settings.userStoryType);
    
    const contentResult = await model.generateContent(content + ' ' + promptSuffix);
    
    if (!contentResult?.response) {
        throw createGenerationError(errors.emptyGeminiResponse);
    }

    const responseString = contentResult.response.text();
    return validateAndParseToProjectDetails(responseString);
}

export async function handleGroqInference(
    endpoint: string, 
    headers: HeadersInit, 
    model: string, 
    content: string, 
    settings: Settings,
    isJsonMode: boolean
) {
    const prompt = `${content} ${USER_STORY_PROMPT(settings.userStoryType)}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            response_format: isJsonMode && { type: "json_object"},
            temperature: 0.8,
            stream: false,
            
        })
    });

    if (!response.ok) {
        throw createGenerationError(`${response.status}: ${errors.aiServiceResponseError}`);
    }

    const jsonData = await response.json();
    
    if (!jsonData.choices?.[0]?.message?.content) {
        throw createGenerationError(errors.aiServiceResponseError);
    }

    return validateAndParseToProjectDetails(jsonData.choices[0].message.content);
}

export async function handleAIInference(
    endpoint: string, 
    headers: HeadersInit, 
    model: string, 
    content: string, 
    settings: Settings,
    isJsonMode: boolean,
) {
    const prompt = `${content} ${USER_STORY_PROMPT(settings.userStoryType)}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            response_format: isJsonMode && PROJECT_SCHEMA_FOR_LMSTUDIO,
            temperature: 0.8,
            stream: false,
        })
    });

    if (!response.ok) {
        throw createGenerationError(`${errors.aiServiceResponseError} ${response.status}`);
    }

    const jsonData = await response.json();
    
    if (!jsonData.choices?.[0]?.message?.content) {
        throw createGenerationError(errors.aiServiceResponseError);
    }

    return validateAndParseToProjectDetails(jsonData.choices[0].message.content);
}
