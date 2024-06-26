import type { GenerativeModel } from "@google/generative-ai";
import { validateAndParseToUserStoriesArray, validateAndParseToPrdResponseObject } from "./utils/helper";
import { USER_STORY_PROMPT, PRD_PROMPT } from "./utils/prompts";
import type { Settings } from "./store";
import { SYSTEM_PROMPT } from "./utils/constants";

export async function handleGeminiProInference(model: GenerativeModel, content: string, promptType: string, settings: any): Promise<any> {
    const promptSuffix = promptType === 'UserStory' ? USER_STORY_PROMPT(settings.userStoryType) : PRD_PROMPT(settings.prdType);
    const prompt = `${content} ${promptSuffix}`;
    try {
        const contentResult = await model.generateContent(prompt);
        const responseString = await contentResult.response.text();
        const result = promptType === 'UserStory' ? validateAndParseToUserStoriesArray(responseString) : validateAndParseToPrdResponseObject(responseString);
        return {
            message: "Operation successful",
            status: 200,
            data: result
        };
    } catch (error: any) {
        return {
            error: `Operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            status: 500
        };
    }
}

export async function handleAIInference(endpoint: string, headers: HeadersInit, model: string, content: string, promptType: string, settings: Settings) {
    const prompt = promptType === 'UserStory' ? `${content} ${USER_STORY_PROMPT(settings.userStoryType)}` : `${content} ${PRD_PROMPT(settings.prdType)}`;
    try {
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
        const jsonData = await response.json();
        const result = promptType === 'UserStory' ? validateAndParseToUserStoriesArray(jsonData.choices[0].message.content) : validateAndParseToPrdResponseObject(jsonData.choices[0].message.content);
        return {
            message: "Operation successful",
            status: 200,
            data: result
        };
    } catch (error: any) {
        return {
            error: `Operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            status: 500
        };
    }
}