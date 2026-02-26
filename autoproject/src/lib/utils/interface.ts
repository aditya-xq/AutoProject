import type { PRDType, UserStoryType, AIInferenceType, ProjectManagementTool, PromptType } from "./types"

export interface UserStory {
    title: string
    description: string
}

export interface ProjectDetails {
    name: string
    description: string
    userStories: UserStory[]
}

export interface SuggestionsObject {
    suggestions: string[]
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
    settings: Settings
    isExistingProject?: boolean
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
    loadingText: string
    promptType: PromptType
    requirements: string
    prd: string
    projectDetails: ProjectDetails
    settings: Settings
    projects: any[]
    activeProject: any
}
