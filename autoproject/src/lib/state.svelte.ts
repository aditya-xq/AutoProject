import { modelMap } from "./utils/config";
import type { AppState } from "./utils/interface";

export const appState: AppState = $state({
	isLoading: false,
    loadingText: 'PROCESSING',
    promptType: 'prd',
	requirements: '',
    prd: '',
    projectDetails: {
        name: '',
        description: '',
        userStories: [],
        teamIds: []
    },
    settings: {
        tool: 'Linear',
        prdType: 'Feature Based', 
        userStoryType: 'Technical', 
        aiInferenceType: 'Gemini',
        aiModel: modelMap['Gemini 2 Flash'],
    },
    projects: [],
    activeProject: {},
});

export const resetState = () => {
    appState.prd = '';
    appState.projectDetails.userStories = [];
    appState.requirements = '';
}