import type { GenerativeModel } from "@google/generative-ai"
import { createGenerationError, errors } from "$lib"
import { SYSTEM_PROMPT } from "$lib/utils/config"

export async function handleGeminiInference(
    model: GenerativeModel, 
    prompt: string,
) { 
    const contentResult = await model.generateContent(prompt)
    
    if (!contentResult?.response) {
        throw createGenerationError(errors.emptyGeminiResponse)
    }

    const responseString = contentResult.response.text()
    return responseString;
}

export async function handleGroqInference(
    endpoint: string, 
    headers: HeadersInit, 
    prompt: string,
    model: string, 
    isJsonMode: boolean,
) {
    const payload: Record<string, unknown> = {
        model,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
        ],
        temperature: 0.8,
        stream: false,
    }

    if (isJsonMode) {
        payload.response_format = { type: "json_object" }
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw createGenerationError(`${response.status}: ${errors.aiServiceResponseError}`)
    }

    const jsonData = await response.json();
    
    if (!jsonData.choices?.[0]?.message?.content) {
        throw createGenerationError(errors.aiServiceResponseError)
    }

    return jsonData.choices[0].message.content
}

export async function handleAIInference(
    endpoint: string, 
    headers: HeadersInit, 
    model: string, 
    prompt: string,
    isJsonMode: boolean,
    jsonSchema: unknown
) {
    const payload: Record<string, unknown> = {
        model,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
        ],
        temperature: 0.8,
        stream: false,
    }

    if (isJsonMode && jsonSchema) {
        payload.response_format = jsonSchema
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw createGenerationError(`${errors.aiServiceResponseError} ${response.status}`)
    }

    const jsonData = await response.json()
    
    if (!jsonData.choices?.[0]?.message?.content) {
        throw createGenerationError(errors.aiServiceResponseError)
    }

    return jsonData.choices[0].message.content
}
