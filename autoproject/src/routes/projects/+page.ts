export const ssr = false

const loadProjects = async () => {
    const { appState } = await import("$lib/state.svelte")
    try {
        const tool = appState.settings.tool
        const projectData = await fetch(`/api/project?tool=${tool}`, {
            method: 'GET',
        })
        const projectJson = await projectData.json()
        appState.projects = projectJson.data
    } catch (error) {
        appState.isLoading = false
        throw error
    }
}

export const load = async () => {
    // Fire and forget - won't block page load
    loadProjects()
    return {}
}
