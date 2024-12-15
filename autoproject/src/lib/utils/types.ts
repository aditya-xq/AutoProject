export type PRDType = 'Feature Based' | 'Focused' | 'Minimal' | 'Narrative';

export type UserStoryType = 
  | 'Technical'     // For developer-focused stories
  | 'User-Focused'  // For end-user experience
  | 'Minimal';      // For basic functionality

export type AIInferenceType = 'Gemini' | 'Groq' | 'LM Studio';

export type ProjectManagementTool = 'Linear' | 'Jira' | 'Asana' | 'Plane' | 'TaskTab';

export type PromptType = 'prd' | 'userStory';
