import type { PRDType, UserStoryType, AIInferenceType, ProjectManagementTool } from "./types";

export const CONFIG = {
    headers: {
        common: { 'Content-Type': 'application/json' },
        groq: (apiKey: string) => ({
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        })
    },
};

export const starterPrompts = [
    { label: '🎭 AI Meme Generator', requirements: 'A platform that uses AI to generate and rate trending memes' },
    { label: '🌱 Plant Whisperer App', requirements: 'An IoT app that lets plants tweet their needs and feelings' },
    { label: '🎮 Productivity RPG', requirements: 'A task manager that turns your daily tasks into an epic RPG adventure' },
    { label: '🌈 Mood Food', requirements: 'An app that suggests recipes based on your current emotions and weather' },
    { label: '🎨 Dream Canvas', requirements: 'An app that turns your described dreams into AI-generated artwork' },
];

export const prdTypeOptions: PRDType[] = ['Feature Based', 'Narrative'];
export const userStoryTypeOptions: UserStoryType[] = ['Role-Feature-Reason', 'Situation-Action-Outcome', 'Given-When-Then'];
export const aiInferenceOptions: AIInferenceType[] = ['Gemini', 'Groq', 'LM Studio'];
export const tools: ProjectManagementTool[] = ['Linear', 'Asana', 'Jira', 'Plane'];
export const aiModelOptions: Record<string, string[]> = {
    'Groq' : ['Llama3.3-70b', 'Mixtral-8x7b'],
    'LM Studio' : ['Phi3-4k', 'Llama3-8b'],
    'Gemini' : ['Gemini-1.5-Flash', 'Gemini-2-Flash'],
};
export const modelMap: any = {
    'Llama3.3-70b' : 'llama-3.3-70b-versatile',
    'Mixtral-8x7b' : 'mixtral-8x7b-32768',
    'Phi3-4k' : 'Phi-3-mini-4k-instruct-GGUF',
    'Llama3-8b' : 'Meta-Llama-3-8B-Instruct-GGUF',
    'Gemini-1.5-Flash' : 'gemini-1.5-flash',
    'Gemini-2-Flash' : 'gemini-2.0-flash-exp',
};