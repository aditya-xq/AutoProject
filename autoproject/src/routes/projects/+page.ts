import { appState } from "$lib/state.svelte";
import type { PageLoad } from "./$types";

// Get all the projects from the appStata.settings.tool
export const load: PageLoad = async ({ fetch }) => {
    const tool = appState.settings.tool;
    const projectData = await fetch(`/api/project?tool=${tool}`, {
        method: 'GET',
    });
    const projectJson = await projectData.json();
    return { projects: projectJson.data };
};