<script lang="ts">
    import { appState } from '$lib/state.svelte';
    import { marked } from 'marked';

    let projects = $derived(appState.projects);
    let selectedProject = $state(null);
    let searchQuery = $state('');

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const selectProject = (project: any) => {
        selectedProject = project;
    };

    const filteredProjects = $derived(searchQuery
        ? projects.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : projects);
</script>

<div class="min-h-screen">
    <div class="container mx-auto max-w-7xl text-gray-100 px-6 py-8">
        <div class="flex items-center justify-between mb-8">
            <div>
                <h1 class="text-2xl font-semibold text-white">Projects</h1>
                <p class="text-gray-400 text-sm mt-1">Connected to {appState.settings.tool}</p>
            </div>
            
            <div class="relative w-64">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search projects..."
                    class="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-600"
                />
            </div>
        </div>
        
        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-5 space-y-3 pr-4 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-thin scrollbar-thumb-gray-700">
                {#if filteredProjects.length > 0}
                    {#each filteredProjects as project (project.id)}
                        <button 
                            onclick={() => selectProject(project)}
                            class="w-full text-left rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-all duration-200
                            {selectedProject?.id === project.id ? 'bg-gray-800 shadow-lg' : ''}"
                        >
                            <div class="p-4 space-y-2">
                                <h2 class="text-lg font-medium text-gray-100">
                                    {project.name}
                                </h2>
                                <p class="text-gray-400 text-sm line-clamp-2">
                                    {project.description}
                                </p>
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-gray-500">{formatDate(project.updatedAt)}</span>
                                    <span class="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded">
                                        {project.issues?.length || 0} stories
                                    </span>
                                </div>
                            </div>
                        </button>
                    {/each}
                {:else}
                    <div class="text-center text-gray-400 py-8 bg-gray-900 rounded-lg">
                        <p>{searchQuery ? 'No matching projects found' : 'No projects available'}</p>
                    </div>
                {/if}
            </div>

            <div class="col-span-7 rounded-lg border border-gray-800">
                {#if selectedProject}
                    <div class="p-6 space-y-6 h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                        <div class="flex items-start justify-between">
                            <div>
                                <h2 class="text-xl font-semibold text-white">
                                    {selectedProject.name}
                                </h2>
                                <p class="mt-2 text-gray-400">
                                    {selectedProject.description}
                                </p>
                            </div>
                            <a 
                                href={selectedProject.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                class="group p-2.5 text-gray-100 rounded-lg transition-all duration-300 flex items-center justify-center"
                                title="Open in {appState.settings.tool}"
                                aria-label="Open in {appState.settings.tool}"
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    class="h-5 w-5 transform group-hover:scale-110 transition-transform duration-200" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path 
                                        stroke-linecap="round" 
                                        stroke-linejoin="round" 
                                        stroke-width="2" 
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                                    />
                                </svg>
                            </a>
                        
                        </div>

                        {#if selectedProject.issues?.length > 0}
                            <div class="space-y-3">
                                <h3 class="text-lg font-medium text-white">Open User Stories</h3>
                                <div class="space-y-3">
                                    {#each selectedProject.issues as issue}
                                        {#if !issue.completedAt}
                                            <div class="bg-gray-800/50 rounded-lg p-4 space-y-2">
                                                <div class="flex items-center justify-between">
                                                    <h4 class="font-medium text-white">
                                                        {issue.title}
                                                    </h4>
                                                    <span class="text-sm text-gray-400">
                                                        {formatDate(issue.updatedAt)}
                                                    </span>
                                                </div>
                                                <div class="prose prose-invert max-w-none text-sm text-gray-300">
                                                    {@html marked(issue.description || 'No description available')}
                                                </div>
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div class="flex items-center justify-center h-[calc(100vh-180px)] text-gray-400">
                        <p>Select a project to view details</p>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    :global(.scrollbar-thin::-webkit-scrollbar) {
        width: 4px;
    }
    :global(.scrollbar-thin::-webkit-scrollbar-track) {
        background: rgba(17, 24, 39, 0.8);
    }
    :global(.scrollbar-thin::-webkit-scrollbar-thumb) {
        background: rgba(55, 65, 81, 0.7);
        border-radius: 9999px;
    }
</style>
