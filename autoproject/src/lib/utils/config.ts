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
    { label: '💰 FIRE Simulator', requirements: 'A Financial Independence, Retire Early (FIRE) Calculator that goes beyond standard formulas. It integrates dynamic variables like regional inflation projections, anticipated geo-arbitrage shifts (cost of living in target countries), and generates Monte Carlo simulations showing the probability of financial stability across various withdrawal strategies.' },
    { label: '📚 Lit Review Assistant', requirements: 'A Literature Review Platform that ingests academic PDFs, uses natural language processing (NLP) to map connections between key methodologies and findings across hundreds of papers, and generates a visualized knowledge graph to identify and summarize emergent themes or historical research gaps.' },
    { label: '👓 Reading App', requirements: 'A Clean Reading Application that is a cross-platform (mobile/desktop) markdown editor prioritizing distraction-free writing and reading. It features optional dynamic text highlighting based on reading speed, a customizable Bionic Reading mode, and seamless single-command export to web, EPUB, and LaTeX.' },
    { label: '👾 Eco-Simulator', requirements: 'An Indie Video Game where the player manages a procedurally generated micro-ecosystem (e.g., a pond, a terrarium). The core mechanic revolves around introducing new life forms and managing the resulting non-linear cascading effects on the food web, water quality, and climate, with a simple, clean, pixel-art aesthetic.' },
    { label: '📺 OTT Tracker', requirements: 'A Dynamic OTT Release Dashboard that scrapes movie/series release data from multiple regional aggregator sites for the current and next week (e.g., Netflix, Prime Video, Disney+). The dashboard must feature personalized filtering by user-defined favorite platforms, languages (e.g., Hindi, Telugu, English), and automatic cross-reference with IMDb/Rotten Tomatoes to display aggregated critic/audience scores alongside each entry.' },
]

export const prdTypeOptions: PRDType[] = ['Feature Based', 'Focused', 'Minimal', 'Narrative', 'Research']
export const userStoryTypeOptions: UserStoryType[] = ['Technical', 'User-Focused', 'Minimal', 'Research']
export const aiInferenceOptions: AIInferenceType[] = ['Gemini', 'Groq', 'LM Studio']
export const tools: ProjectManagementTool[] = ['Linear', 'Asana', 'Jira', 'Plane']
export const aiModelOptions: Record<string, string[]> = {
    'Groq' : ['Kimi K2', 'Llama 3.3 70b', 'Llama 4 Maverick'],
    'LM Studio' : ['Granite 4H Tiny', 'Llama 3.1 8b', 'Gemma 3 12b', 'Phi 4'],
    'Gemini' : ['Gemini 2.5 Flash', 'Gemini 3 Pro'],
}
export const modelMap: any = {
    'Llama 3.3 70b' : 'llama-3.3-70b-versatile',
    'Llama 4 Maverick' : 'meta-llama/llama-4-maverick-17b-128e-instruct',
    'Phi 4' : 'phi-4',
    'Llama 3.1 8b' : 'meta-llama-3.1-8b-instruct',
    'Gemma 3 12b' : 'gemma-3-12b-it',
    'Gemini 3 Pro' : 'gemini-3-pro-preview',
    'Gemini 2.5 Flash' : 'gemini-2.5-flash',
    'Kimi K2': 'moonshotai/kimi-k2-instruct',
    'Granite 4H Tiny': 'ibm/granite-4-h-tiny',
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

export const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
export const SYSTEM_PROMPT = "You are a smart and intelligent assistant who always responds correctly and meticulously follow the given instructions. You will directly start with the answer to the point."
