import { type UserStoryType } from "$lib";

export const PRD_PROMPTS = {
    'Feature Based': `Write a comprehensive feature based PRD for the given requirements. Directly respond with Markdown format PRD.`,
  
    Focused: `Write a targeted PRD that defines the core problem, minimal viable solution, success criteria, critical user journeys, and essential feature set for the given reuquirements. Directly respond with Markdown format PRD.`,
  
    Minimal: `Write a lean PRD capturing the requirement's core purpose, primary user benefit, 3-5 essential features, key success metric, for the given requirements. Directly respond with Markdown format PRD.`,
  
    Narrative: `Write a story-driven PRD exploring the requirement's origin, user's emotional journey, solution impact, and feature narratives for the given requirements. Directly respond with Markdown format PRD.`,
};

const typeSpecificInstructions = {
    'Technical': 'focusing on system architecture, APIs, database schemas, and technical requirements',
    'User-Focused': 'detailing user interactions, experience flows, and satisfaction metrics',
    'Minimal': 'focusing on core functionality and critical user needs',
};

export const USER_STORY_PROMPT = (userStoryType: UserStoryType) => {
    return `Create user stories in ${userStoryType} type from the given PRD in the form of a code fenced JSON object {
      name: 'Give the project a unique and creative name',
      description: 'A short summary',
      userStories: [
        {
          title: 'A title for the given user story',
          description: 'A markdown string with short description to the userstory ${typeSpecificInstructions[userStoryType]}, followed by a list of tasks to implement the given user story in a step by step manner from a technical and system design perspective.'
        },
      ],
    }. Your response must be the required code fenced json object with only the above mentioned keys. Do not add any additional information.`;
};

export const ADD_NEW_FEATURE_TO_EXISTING_PROJECT = (userStoryType: UserStoryType) => {
  return `Create feature user stories in ${userStoryType} type from the given feature PRD in the form of a code fenced JSON object {
    name: 'Give the feature a unique and creative name',
    description: 'A short summary',
    userStories: [
      {
        title: 'A title for the given feature user story',
        description: 'A markdown string with short description to the userstory ${typeSpecificInstructions[userStoryType]}, followed by a list of tasks to implement the given user story in a step by step manner from a technical and system design perspective.'
      },
    ],
  }. Your response must be the required code fenced json object with only the above mentioned keys. Do not add any additional information.`;
}

export const SUGGEST_FEATURES_PROMPT = (projectContext: string) => {
  return `Use the below project context to ideate and suggest four new features that can be added into the project scope. The feature suggestion prompts must be short and concise and must imply as to be something that can be added to the existing project. 
    Here's the context: ${projectContext}. Your response must be the required code fenced json array { suggestions: [] } with the required suggestion strings. Do not add any additional information.`;
}