import { createValidationError, errors } from "./errors";
import type { ProjectDetails, UserStory } from "./interface";

const JSON_PATTERNS = [
    /```json\s+([\s\S]+?)\s+```/,
    /```javascript\s+([\s\S]+?)\s+```/,
    /```js\s+([\s\S]+?)\s+```/,
    /\{[\s\S]*\}/  // Fallback pattern to catch any JSON structure
] as const;

function extractJson<T>(markdown: string): T {
    const cleanedMarkdown = markdown.trim();
    let jsonStr = '';
    
    for (const pattern of JSON_PATTERNS) {
        const match = cleanedMarkdown.match(pattern);
        if (match?.[1] || match?.[0]) {  // Check for both group capture and full match
            jsonStr = (match[1] || match[0]).trim();
            break;
        }
    }

    if (!jsonStr) {
        throw createValidationError(errors.jsonCodeFenceNotFound);
    }

    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        throw createValidationError(`${errors.jsonParsingFailed}: ${e instanceof Error ? e.message : errors.unknownError}`);
    }
}

function validateUserStory(story: UserStory, index: number): void {
    if (!story.title?.trim() || !story.description?.trim()) {
        throw createValidationError(`User story at index ${index} has missing or invalid fields`);
    }
}

export function validateAndParseToProjectDetails(jsonString: string): ProjectDetails {
    if (!jsonString?.trim()) {
        throw createValidationError('Empty or invalid JSON string provided');
    }

    const details = extractJson<ProjectDetails>(jsonString);
    
    details.userStories.forEach((story, index) => {
        validateUserStory(story, index);
    });

    if (!details.name?.trim() || !details.description?.trim()) {
        throw createValidationError('Project name or description is empty');
    }

    return details;
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
    );
}
