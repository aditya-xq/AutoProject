import { createValidationError, errors } from "./errors";
import type { GeneratePrdResponse, ProjectDetails, UserStory } from "./interface";

function escapeJsonString(jsonString: string): string {
    const escapeMap = {
        '\\': '\\\\',
        '"': '\\"',
        '\n': '\\n',
        '\r': '\\r',
        '\t': '\\t'
    };
    return jsonString.replace(/[\\"\n\r\t]/g, char => escapeMap[char as keyof typeof escapeMap]);
}

function extractJson<T>(markdown: string): T {
    const jsonFencePattern = /```json\s+([\s\S]+?)\s+```/;
    const match = markdown.match(jsonFencePattern);

    if (!match) {
        throw createValidationError(errors.jsonCodeFenceNotFound);
    }

    const jsonStr = match[1].trim();
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        // Try to fix common JSON formatting issues
        const correctedJsonStr = fixJsonFormatting(jsonStr);
        try {
            return JSON.parse(correctedJsonStr) as T;
        } catch (e) {
            throw createValidationError(`${errors.jsonParsingFailed}: ${e instanceof Error ? e.message : errors.unknownError}`);
        }
    }
}

function fixJsonFormatting(jsonStr: string): string {
    // Fix unterminated strings
    const unterminatedPattern = /"([^"]*?)$/gm;
    const matches = jsonStr.match(unterminatedPattern);
    
    if (matches) {
        let correctedJson = jsonStr;
        matches.forEach(unterminated => {
            correctedJson = correctedJson.replace(
                unterminated, 
                `${escapeJsonString(unterminated)}"`
            );
        });
        return correctedJson;
    }
    return jsonStr;
}

export function validateUserStory(userStory: UserStory, index: number): void {
    if (!userStory.title?.trim()) {
        throw createValidationError(`User story at index ${index} has an empty or invalid title`);
    }
    if (!userStory.description?.trim()) {
        throw createValidationError(`User story at index ${index} has an empty or invalid description`);
    }
}

export function validatePrdDetails(details: GeneratePrdResponse): void {
    if (!details.prd?.trim()) {
        throw createValidationError(errors.prdContentIsEmpty);
    }
    if (!details.projectDetails?.name?.trim()) {
        throw createValidationError(errors.projectNameIsEmpty);
    }
    if (!details.projectDetails?.description?.trim()) {
        throw createValidationError(errors.projectDescriptionIsEmpty);
    }
}

export function validateAndParseToUserStoriesArray(jsonString: string): ProjectDetails {
    try {
        const details = extractJson<ProjectDetails>(jsonString);
        if (!Array.isArray(details.userStories)) {
            throw createValidationError(errors.userStoriesIsNotArray);
        }
        if (details.name?.trim() === '') {
            throw createValidationError(errors.projectNameIsEmpty);
        }
        if (details.description?.trim() === '') {
            throw createValidationError(errors.projectDescriptionIsEmpty);
        }
        details.userStories.forEach((story, index) => validateUserStory(story, index));
        return details;
    } catch (error: any) {
        throw createValidationError(`${error.message || 'Unknown error'}`);
    }
}

export function validateAndParseToPrdResponseObject(jsonString: string): GeneratePrdResponse {
    try {
        const response = extractJson<GeneratePrdResponse>(jsonString);
        validatePrdDetails(response);
        return response;
    } catch (error: any) {
        throw createValidationError(`${error.message || 'Unknown error'}`);
    }
}

export function createResponse(data: any, status: number): Response {
    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
    };

    return new Response(
        JSON.stringify({
            success: status >= 200 && status < 300,
            data,
            timestamp: new Date().toISOString()
        }),
        { status, headers }
    );
}
