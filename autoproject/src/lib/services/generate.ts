import type { GenerativeModel } from "@google/generative-ai";
import { validateAndParseToUserStoriesArray, validateAndParseToPrdResponseObject } from "../utils/helper";
import { USER_STORY_PROMPT, PRD_PROMPT } from "../utils/prompts";
import { SYSTEM_PROMPT } from "../utils/constants";
import { createGenerationError, errors, type Settings } from "$lib";

export async function handleGeminiInference(
    model: GenerativeModel, 
    content: string, 
    promptType: string, 
    settings: Settings
) {
    const promptSuffix = promptType === 'userStory' 
        ? USER_STORY_PROMPT(settings.userStoryType) 
        : PRD_PROMPT(settings.prdType);
    
    const contentResult = await model.generateContent(content + ' ' + promptSuffix);
    
    if (!contentResult?.response) {
        throw createGenerationError(errors.emptyGeminiResponse);
    }

    const responseString = contentResult.response.text();
    return promptType === 'userStory' 
        ? validateAndParseToUserStoriesArray(responseString)
        : validateAndParseToPrdResponseObject(responseString);
}

export async function handleAIInference(
    endpoint: string, 
    headers: HeadersInit, 
    model: string, 
    content: string, 
    promptType: string, 
    settings: Settings
) {
    const prompt = promptType === 'userStory' 
        ? `${content} ${USER_STORY_PROMPT(settings.userStoryType)}`
        : `${content} ${PRD_PROMPT(settings.prdType)}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            stream: false
        })
    });

    if (!response.ok) {
        throw createGenerationError(`${errors.aiServiceResponseError} ${response.status}`);
    }

    const jsonData = await response.json();
    
    if (!jsonData.choices?.[0]?.message?.content) {
        throw createGenerationError(errors.aiServiceResponseError);
    }

    return promptType === 'userStory'
        ? validateAndParseToUserStoriesArray(jsonData.choices[0].message.content)
        : validateAndParseToPrdResponseObject(jsonData.choices[0].message.content);
}
