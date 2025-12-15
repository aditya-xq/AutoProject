import { createValidationError, errors } from "./errors"
import type { ProjectDetails, SuggestionsObject, UserStory } from "./interface"

const JSON_PATTERNS = [
    /```json\s+([\s\S]+?)\s+```/,
    /```javascript\s+([\s\S]+?)\s+```/,
    /```js\s+([\s\S]+?)\s+```/,
    /\{[\s\S]*\}/  // Fallback pattern to catch any JSON structure
] as const

function extractJson<T>(markdown: string): T {
    const cleanedMarkdown = markdown.trim()
    let jsonStr = ''
    
    for (const pattern of JSON_PATTERNS) {
        const match = cleanedMarkdown.match(pattern)
        if (match?.[1] || match?.[0]) {  // Check for both group capture and full match
            jsonStr = (match[1] || match[0]).trim()
            break
        }
    }

    if (!jsonStr) {
        throw createValidationError(errors.jsonCodeFenceNotFound)
    }

    try {
        return JSON.parse(jsonStr) as T
    } catch (e) {
        throw createValidationError(`${errors.jsonParsingFailed}: ${e instanceof Error ? e.message : errors.unknownError}`)
    }
}

function validateUserStory(story: UserStory, index: number): void {
    if (!story.title?.trim() || !story.description?.trim()) {
        throw createValidationError(`User story at index ${index} has missing or invalid fields`)
    }
}

export function validateAndParseToProjectDetails(jsonString: string): ProjectDetails {
    if (!jsonString?.trim()) {
        throw createValidationError('Empty or invalid JSON string provided')
    }

    const details = extractJson<ProjectDetails>(jsonString)
    
    details.userStories.forEach((story, index) => {
        validateUserStory(story, index)
    })

    if (!details.name?.trim() || !details.description?.trim()) {
        throw createValidationError('Project name or description is empty')
    }

    return details
}

export function validateAndParseFeatureSuggestions(jsonString: string): string[] {
    if (!jsonString?.trim()) {
        throw createValidationError('Empty or invalid JSON string provided')
    }

    if (JSON.parse(jsonString).length === 4 ) {
        return JSON.parse(jsonString)
    }

    const suggestionsObject = extractJson<SuggestionsObject>(jsonString)
    
    if (!Array.isArray(suggestionsObject.suggestions)) {
        throw createValidationError('Feature suggestions must be an array')
    }

    if (suggestionsObject.suggestions.length === 0 || suggestionsObject.suggestions.length > 4) {
        throw createValidationError('Feature suggestions must contain between 1 and 4 items')
    }

    suggestionsObject.suggestions.forEach((suggestion, index) => {
        if (!suggestion?.trim()) {
            throw createValidationError(`Feature suggestion at index ${index} is empty or invalid`)
        }
    })

    return suggestionsObject.suggestions
}

export function createResponse(data: any, status: number): Response {
    return new Response(
        JSON.stringify({
            success: status >= 200 && status < 300,
            data,
        }),
        { 
            status, 
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
        }
    )
}
