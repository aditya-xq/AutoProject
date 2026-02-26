import { createValidationError, errors } from './errors'
import type { ProjectDetails, SuggestionsObject, UserStory } from './interface'

const JSON_PATTERNS = [
    /```json\s+([\s\S]+?)\s+```/i,
    /```javascript\s+([\s\S]+?)\s+```/i,
    /```js\s+([\s\S]+?)\s+```/i,
    /(\{[\s\S]*\}|\[[\s\S]*\])/ // fallback for raw JSON object/array
] as const

function safeJsonParse<T>(value: string): T | null {
    try {
        return JSON.parse(value) as T
    } catch {
        return null
    }
}

function extractJson<T>(rawText: string): T {
    const cleanedText = rawText.trim()

    for (const pattern of JSON_PATTERNS) {
        const match = cleanedText.match(pattern)
        if (!match) continue

        const candidate = (match[1] || match[0]).trim()
        const parsed = safeJsonParse<T>(candidate)
        if (parsed !== null) return parsed
    }

    throw createValidationError(errors.jsonCodeFenceNotFound)
}

function validateUserStory(story: UserStory, index: number): void {
    if (!story?.title?.trim() || !story?.description?.trim()) {
        throw createValidationError(`User story at index ${index} has missing or invalid fields`)
    }
}

function validateSuggestionsArray(suggestions: string[]): string[] {
    if (!Array.isArray(suggestions)) {
        throw createValidationError('Feature suggestions must be an array')
    }

    if (suggestions.length === 0 || suggestions.length > 4) {
        throw createValidationError('Feature suggestions must contain between 1 and 4 items')
    }

    suggestions.forEach((suggestion, index) => {
        if (typeof suggestion !== 'string' || !suggestion.trim()) {
            throw createValidationError(`Feature suggestion at index ${index} is empty or invalid`)
        }
    })

    return suggestions
}

export function validateAndParseToProjectDetails(jsonString: string): ProjectDetails {
    if (!jsonString?.trim()) {
        throw createValidationError('Empty or invalid JSON string provided')
    }

    const details = extractJson<ProjectDetails>(jsonString)

    if (!details?.name?.trim() || !details?.description?.trim()) {
        throw createValidationError('Project name or description is empty')
    }

    if (!Array.isArray(details.userStories) || details.userStories.length === 0) {
        throw createValidationError('User stories must be a non-empty array')
    }

    details.userStories.forEach((story, index) => {
        validateUserStory(story, index)
    })

    return details
}

export function validateAndParseFeatureSuggestions(jsonString: string): string[] {
    if (!jsonString?.trim()) {
        throw createValidationError('Empty or invalid JSON string provided')
    }

    const directParsed = safeJsonParse<string[] | SuggestionsObject>(jsonString)
    if (Array.isArray(directParsed)) {
        return validateSuggestionsArray(directParsed)
    }
    if (directParsed && Array.isArray((directParsed as SuggestionsObject).suggestions)) {
        return validateSuggestionsArray((directParsed as SuggestionsObject).suggestions)
    }

    const parsed = extractJson<string[] | SuggestionsObject>(jsonString)
    if (Array.isArray(parsed)) {
        return validateSuggestionsArray(parsed)
    }

    const suggestionsObject = parsed as SuggestionsObject
    return validateSuggestionsArray(suggestionsObject.suggestions)
}

export function createResponse(data: unknown, status: number): Response {
    return new Response(
        JSON.stringify({
            success: status >= 200 && status < 300,
            data
        }),
        {
            status,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
        }
    )
}
