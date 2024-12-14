// Streamlining error handling in TypeScript

type ValidationErrorType = {
    name: string;
    message: string;
    code: number;
};

type GenerationErrorType = {
    name: string;
    message: string;
};
  
export const createValidationError = (message: string, code: number = 400): ValidationErrorType => ({
    name: 'ValidationError',
    message,
    code
});

export const createGenerationError = (message: string): GenerationErrorType => ({
    name: 'GenerationError',
    message
});

export const errors: Record<string, string> = {
    jsonCodeFenceNotFound: 'No JSON code fence found in the response',
    jsonParsingFailed: 'JSON parsing failed',
    unknownError: 'An unknown error occurred',
    userStoryValidationError: 'User story validation failed',
    prdContentIsEmpty: 'PRD content cannot be empty',
    projectNameIsEmpty: 'Project name cannot be empty',
    projectDescriptionIsEmpty: 'Project description cannot be empty',
    userStoriesIsNotArray: 'Parsing error: User stories must be an array',
    userStoryParsingFailed: 'Failed to parse user stories',
    prdParsingError: 'Failed to parse PRD',
    emptyGeminiResponse: 'Empty response from Gemini',
    aiServiceResponseError: 'Error in AI service response',
    groqApiNotConfigured: 'Groq API not configured',
    geminiApiNotConfigured: 'Gemini API not configured',
    invalidAiInferenceType: 'Invalid AI inference type',
}
