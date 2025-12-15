import { modelMap } from "./utils/config"
import type { AppState } from "./utils/interface"

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
        prdType: 'Minimal', 
        userStoryType: 'Minimal', 
        aiInferenceType: 'Groq',
        aiModel: modelMap['Kimi K2'],
    },
    projects: [],
    activeProject: {},
})

export const resetState = () => {
    appState.prd = ''
    appState.projectDetails.userStories = []
    appState.requirements = ''
}
