import type { PRDType, UserStoryType, AIInferenceType, ProjectManagementTool } from "./types"

export const CONFIG = {
    headers: {
        common: { 'Content-Type': 'application/json' },
        groq: (apiKey: string) => ({
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        })
    },
}

export const starterPrompts = [
    { label: '🎵 Music Mood Journal', requirements: 'App that creates personalized playlists based on daily mood entries and helps track emotional well-being through music' },
    { label: '🌍 Carbon Tracker', requirements: 'An enterprise solution for companies to track, report, and optimize their carbon emissions across supply chains' },
    { label: '📚 Academic Assistant', requirements: 'Platform helping researchers analyze papers, extract key findings, and generate literature review summaries with citation management' },
    { label: '🎨 Design Generator', requirements: 'A tool that automatically generates and maintains component libraries and design tokens from Figma files' },
    { label: '⌛ Digital Time Capsule', requirements: 'App creating multimedia memories with friends and family, set to unlock at future dates with AI-enhanced storytelling' },
]

export const prdTypeOptions: PRDType[] = ['Feature Based', 'Focused', 'Minimal', 'Narrative', 'Research']
export const userStoryTypeOptions: UserStoryType[] = ['Technical', 'User-Focused', 'Minimal', 'Research']
export const aiInferenceOptions: AIInferenceType[] = ['Gemini', 'Groq', 'LM Studio']
export const tools: ProjectManagementTool[] = ['Linear', 'Asana', 'Jira', 'Plane']
export const aiModelOptions: Record<string, string[]> = {
    'Groq' : ['Llama 3.3 70b', 'Qwen 2.5 32b', 'Llama 4 Scout'],
    'LM Studio' : ['Llama 3.1 8b', 'Phi 4', 'Gemma 3 12b'],
    'Gemini' : ['Gemini 2 Flash', 'Gemini 2.5 Pro'],
}
export const modelMap: any = {
    'Llama 3.3 70b' : 'llama-3.3-70b-versatile',
    'Qwen 2.5 32b' : 'qwen-2.5-32b',
    'Llama 4 Scout' : 'meta-llama/llama-4-scout-17b-16e-instruct',
    'Phi 4' : 'phi-4',
    'Llama 3.1 8b' : 'meta-llama-3.1-8b-instruct',
    'Gemma 3 12b' : 'gemma-3-12b-it',
    'Gemini 2.5 Pro' : 'gemini-2.5-pro-exp-03-25',
    'Gemini 2 Flash' : 'gemini-2.0-flash',
}

export const PROJECT_SCHEMA_FOR_LMSTUDIO = {
    type: "json_schema",
    json_schema: {
        name: "project",
        schema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Project name"
                },
                description: {
                    type: "string",
                    description: "Project description"
                },
                userStories: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: {
                                type: "string",
                                description: "User story title"
                            },
                            description: {
                                type: "string",
                                description: "Detailed user story description with technical implementation steps"
                            }
                        },
                        required: ["title", "description"]
                    },
                    minItems: 1
                }
            },
            required: ["name", "description", "userStories"]
        }
    }
}

export const FEATURE_SUGGESTIONS_SCHEMA = {
    type: "json_schema",
    json_schema: {
        name: "featureSuggestions",
        schema: {
            type: "array",
            items: {
                type: "string",
                description: "A suggested feature description"
            },
            minItems: 1,
            maxItems: 4
        }
    }
}

export const LM_STUDIO_SERVER = 'http://localhost:1234/v1/chat/completions'
export const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
export const SYSTEM_PROMPT = "You are a smart and intelligent assistant who always responds correctly and meticulously follow the given instructions. You will directly start with the answer to the point."
