<script lang="ts">
    import { fade, fly } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'
    import { appState } from '$lib/state.svelte'
    import { notificationStore } from '$lib/store'
    import { FEATURE_SUGGESTIONS_SCHEMA } from '$lib/utils/config'

    let { isOpen = $bindable() } = $props()

    let searchTerm = $state('')
    let projects: any[] = $derived(appState.projects)
    let loading = false

    let filteredProjects = $derived(projects.filter((project) => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
    ))

    async function handleFeatureSuggestions() {
        appState.isLoading = true
        const response = await fetch('/api/feature', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                projectContext: JSON.stringify(appState.activeProject),
                settings: appState.settings,
                isJsonMode: true,
                jsonSchema: FEATURE_SUGGESTIONS_SCHEMA,
            })
        })
        const result = await response.json()
        if (response.ok) {
            appState.isLoading = false
            appState.activeProject.suggestions = result.data
            return
        }
        if (!response.ok || !result.success) {
            appState.isLoading = false
            return
        }
    }

    async function handleProjectSelect(project: any) {
        appState.activeProject = project
        await handleFeatureSuggestions()        
        isOpen = false
        notificationStore.addNotification('Project imported successfully', 'success')
    }

    function handleClose() {
        searchTerm = ''
        isOpen = false
    }

    function handleInput(e: any) {
        searchTerm = (e.target as HTMLInputElement).value
    }

</script>

{#if isOpen}
    <div 
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" 
        transition:fade={{ duration: 200 }}
    >
        <div class="flex items-start justify-center pt-24 p-4">
            <div 
                class="w-full max-w-xl bg-gray-900/95 rounded-lg shadow-2xl border border-gray-800/50"
                transition:fly={{ y: -20, duration: 300, easing: cubicOut }}
            >
                <div class="flex items-center justify-between p-4 border-b border-gray-800/50">
                    <h2 class="text-lg font-medium text-white">Select Project</h2>
                    <button 
                        class="text-gray-400 hover:text-white transition-all duration-200 transform hover:scale-110"
                        aria-label="close modal"
                        onclick={handleClose}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="p-4">
                    <input
                        type="text"
                        value={searchTerm}
                        oninput={handleInput}
                        placeholder="Search projects..."
                        class="w-full px-3 py-2 text-white bg-gray-800/50 border border-gray-700/50 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
                    />
                </div>

                <div class="p-4 max-h-[50vh] overflow-y-auto">
                    {#if loading}
                        <div class="flex justify-center py-6">
                            <div class="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
                        </div>
                    {:else if filteredProjects.length === 0}
                        <div class="text-center py-6 text-gray-400 text-sm">
                            No projects found
                        </div>
                    {:else}
                        <div class="space-y-2">
                            {#each filteredProjects as project (project.name)}
                                <button
                                    class="w-full flex items-center p-3 bg-gray-800/30 rounded-md hover:bg-gray-700/50 transition-all duration-200 text-left group hover:translate-x-1"
                                    onclick={() => handleProjectSelect(project)}
                                >
                                    <div class="flex-1 min-w-0">
                                        <h3 class="text-sm font-medium text-white truncate group-hover:text-purple-400 transition-colors duration-200">
                                            {project.name}
                                        </h3>
                                        <p class="text-xs text-gray-400 mt-0.5 truncate">{project.description}</p>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-purple-400 transition-all duration-200 transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}
