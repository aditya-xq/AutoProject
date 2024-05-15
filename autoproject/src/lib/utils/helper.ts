import type { GeneratePrdResponse, UserStory } from "./interface";

function escapeJsonString(jsonString: string): string {
    return jsonString.replace(/\\/g, '\\\\')
                     .replace(/"/g, '\\"')
                     .replace(/\n/g, '\\n')
                     .replace(/\r/g, '\\r')
                     .replace(/\t/g, '\\t');
}

function extractJson<T>(markdown: string): T | null {
    // Regular expression to find JSON code fence in Markdown
    const jsonFencePattern = /```json\s+([\s\S]+?)\s+```/;

    // Find the JSON code fence in the input string
    const match = markdown.match(jsonFencePattern);

    if (match) {
        const jsonStr = match[1]; // The JSON object or array is captured in the first group
        try {
            const jsonObj = JSON.parse(jsonStr) as T;
            return jsonObj;
        } catch (e) {
            const unterminatedPattern = /"([^"]*?)$/gm;
            const match = jsonStr.match(unterminatedPattern);
            if (match) {
                let correctedJsonString = jsonStr;
                match.forEach(unterminatedString => {
                    const escapedString = escapeJsonString(unterminatedString);
                    correctedJsonString = correctedJsonString.replace(unterminatedString, escapedString + '"');
                });
                try {
                    const jsonObj = JSON.parse(correctedJsonString);
                    return jsonObj;
                } catch (e) {
                    // Handle JSON parsing error with more context
                    console.error('Failed to parse JSON:', e, 'Input:', jsonStr);
                    throw new Error(`Failed to parse JSON`);
                }
            }
        }
    }
    return null;
}


// Validation Functions
export function validateUserStory(userStory: UserStory, index: number): void {
    if (!userStory.title || typeof userStory.title !== 'string' || !userStory.description || typeof userStory.description !== 'string') {
        throw new Error(`Invalid Task at index ${index}: Title or description is missing or incorrect type.`);
    }
}

export function validatePrdDetails(details: GeneratePrdResponse): void {
    if (!details.prd || typeof details.prd !== 'string') {
        throw new Error("Invalid 'prd': Must be a non-empty string.");
    }
    if (!details.projectDetails.name || typeof details.projectDetails.name !== 'string' || !details.projectDetails.description || typeof details.projectDetails.description !== 'string') {
        throw new Error("Invalid 'projectDetails': Name or description is missing or incorrect type.");
    }
}

// JSON Structure Validators
export function validateAndParseToUserStoriesArray(jsonString: string): UserStory[] {
    const stories = extractJson<UserStory[]>(jsonString);
    if (!stories) {
        throw new Error('Failed to parse JSON to UserStory array. Please try again.');
    }
    stories.forEach((story, index) => validateUserStory(story, index));
    return stories;
}

export function validateAndParseToPrdResponseObject(jsonString: string): GeneratePrdResponse {
    const response = extractJson<GeneratePrdResponse>(jsonString);
    if (!response) {
        throw new Error('Failed to parse JSON to GeneratePrdResponse. Please try again');
    }
    validatePrdDetails(response);
    return response;
}

// Response Creation Simplified
export function createResponse(data: any, status: number): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}