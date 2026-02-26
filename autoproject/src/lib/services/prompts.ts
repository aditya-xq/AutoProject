import type { UserStoryType } from '$lib'

export const PRD_PROMPTS = {
    'Feature Based': `Write a comprehensive feature-based PRD for the given requirement. Cover problem statement, goals, key features, user journeys, non-functional requirements, and success metrics. Return Markdown only.`,
    Focused: `Write a focused PRD for the given requirement. Cover the core problem, scope boundaries, minimal solution, critical user flows, and measurable success criteria. Return Markdown only.`,
    Minimal: `Write a lean PRD for the given requirement. Include purpose, target users, 3-5 essential features, constraints, and one primary success metric. Return Markdown only.`,
    Narrative: `Write a narrative PRD for the given requirement. Explain user context, pain points, journey, solution storyline, and feature rationale. Return Markdown only.`,
    Research: `Write a research-oriented PRD for the given requirement. Include research problem, hypotheses, methodology, experiment design, data strategy, analysis plan, risks, and expected outcomes. Return Markdown only.`
} as const

const typeSpecificInstructions: Record<UserStoryType, string> = {
    Technical: 'focused on architecture, APIs, storage design, integration contracts, and implementation detail',
    'User-Focused': 'focused on UX flow, user intent, interaction quality, and adoption outcomes',
    Minimal: 'focused on the smallest complete slice of value with clear implementation steps',
    Research: 'focused on research milestones, methodology rigor, evidence collection, and analysis tasks'
}

const USER_STORY_JSON_SCHEMA = `{
  "name": "unique and concise project name",
  "description": "short project summary",
  "userStories": [
    {
      "title": "clear user story title",
      "description": "markdown description with context, acceptance criteria, and implementation tasks"
    }
  ]
}`

export const USER_STORY_PROMPT = (userStoryType: UserStoryType) => {
    return `Create ${userStoryType} user stories from the given PRD.
The description for each story must be ${typeSpecificInstructions[userStoryType]}.
Every story description must include:
1) context and objective,
2) acceptance criteria,
3) implementation task list in execution order.

Return ONLY a valid JSON object (no extra prose, no markdown fences) with this exact shape:
${USER_STORY_JSON_SCHEMA}`
}

export const ADD_NEW_FEATURE_TO_EXISTING_PROJECT = (userStoryType: UserStoryType) => {
    return `The input describes a new feature for an existing project.
Create ${userStoryType} feature user stories that fit into the existing product context.
The description for each story must be ${typeSpecificInstructions[userStoryType]}.
Every story description must include:
1) integration impact on existing behavior,
2) acceptance criteria,
3) implementation task list in execution order.

Return ONLY a valid JSON object (no extra prose, no markdown fences) with this exact shape:
${USER_STORY_JSON_SCHEMA}`
}

export const SUGGEST_FEATURES_PROMPT = (projectContext: string) => {
    return `Use the project context below to propose up to four high-impact feature ideas that can be realistically added to the current scope.
Each suggestion must be concise (one sentence), specific, and implementation-oriented.
Project context:
${projectContext}

Return ONLY a valid JSON object (no extra prose, no markdown fences) with this exact shape:
{"suggestions": ["...", "..."]}`
}

export const RESEARCH_USER_STORY_PROMPT = (userStoryType: UserStoryType) => {
    return `Create research-focused ${userStoryType} user stories from the given research PRD.
The description for each story must be ${typeSpecificInstructions[userStoryType]}.
Every story description must include:
1) research objective and scope,
2) validity criteria and measurable outputs,
3) implementation tasks (tooling, data, analysis, reporting).

Return ONLY a valid JSON object (no extra prose, no markdown fences) with this exact shape:
${USER_STORY_JSON_SCHEMA}`
}
