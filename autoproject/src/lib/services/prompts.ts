import { type UserStoryType } from "$lib";

export const PRD_PROMPTS = {
    'Feature Based': `Write a comprehensive feature based PRD for the given requirements. Directly respond with Markdown format PRD.`,
  
    Focused: `Write a targeted PRD that defines the core problem, minimal viable solution, success criteria, critical user journeys, and essential feature set for the given reuquirements. Directly respond with Markdown format PRD.`,
  
    Minimal: `Write a lean PRD capturing the product's core purpose, primary user benefit, 3-5 essential features, key success metric, for the given requirements. Directly respond with Markdown format PRD.`,
  
    Narrative: `Write a story-driven PRD exploring the product's origin, user's emotional journey, solution impact, and feature narratives for the given requirements. Directly respond with Markdown format PRD.`,
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