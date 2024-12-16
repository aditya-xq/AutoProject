import { appState } from "$lib/state.svelte";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
    try {
        const tool = appState.settings.tool;
        const projectData = await fetch(`/api/project?tool=${tool}`, {
            method: 'GET',
        });
        const projectJson = await projectData.json();
        
        return { 
            projects: projectJson.data,
            streamed: {
                // This will stream the data after initial load
                slowData: new Promise((resolve) => {
                    appState.isLoading = false;
                    resolve(projectJson.data);
                })
            }
        };
    } catch (error) {
        appState.isLoading = false;
        throw error;
    }
};
