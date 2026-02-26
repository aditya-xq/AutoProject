export type PRDType = 'Feature Based' | 'Focused' | 'Minimal' | 'Narrative' | 'Research'

export type UserStoryType = 
  | 'Technical'     // For developer-focused stories
  | 'User-Focused'  // For end-user experience
  | 'Minimal'       // For basic functionality
  | 'Research'   // For research-oriented stories

export type AIInferenceType = 'Gemini' | 'Groq' | 'LM Studio'

export type ProjectManagementTool = 'Linear' | 'Jira' | 'Asana' | 'Plane'

export type PromptType = 'prd' | 'userStory'
