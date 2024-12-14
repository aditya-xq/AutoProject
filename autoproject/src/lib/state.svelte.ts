import type { AppState } from "./utils/interface";

export const appState: AppState = $state({
	isLoading: false,
    promptType: 'prd',
	requirements: '',
    prd: '',
    userStories: [],
    projectDetails: {
        name: '',
        description: '',
        teamIds: []
    },
    settings: {
        tool: 'Linear',
        prdType: 'Feature Based', 
        userStoryType: 'Role-Feature-Reason', 
        aiInferenceType: 'LM Studio',
        aiModel: 'Meta-Llama-3-8B-Instruct-GGUF',
    }
});

export const resetState = () => {
    appState.prd = '';
    appState.userStories = [];
    appState.requirements = '';
}