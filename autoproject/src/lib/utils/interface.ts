import type { ProjectCreateInput } from "@linear/sdk/dist/_generated_documents"
import type { PRDType, UserStoryType, AIInferenceType, ProjectManagementTool, PromptType } from "./types"

export interface UserStory {
    title: string
    description: string
}

export interface ProjectDetails {
    name: string
    description: string
}

export interface GeneratePrdResponse {
    prd: string
    projectDetails: {
        name: string
        description: string
    }
}

export interface GenerateRequest {
    prd?: string;
    requirements?: string;
    settings: {
        aiInferenceType: 'LM Studio' | 'Groq' | 'Gemini';
        aiModel: string;
        userStoryType: string;
        prdType: string;
    }
}

export interface Settings {
    prdType: PRDType
    userStoryType: UserStoryType
    aiInferenceType: AIInferenceType
    tool: ProjectManagementTool
    aiModel: string
}

export interface AppState {
    isLoading: boolean
    promptType: PromptType
    requirements: string
    prd: string
    userStories: UserStory[]
    projectDetails: ProjectCreateInput
    settings: Settings
}