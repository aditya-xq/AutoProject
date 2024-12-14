<script lang="ts">
    import { appState } from '$lib/state.svelte';
    import { marked } from 'marked';
    let { data }: { data: any} = $props();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
</script>

<div class="text-gray-100 min-h-screen flex flex-col px-6 md:px-16 lg:px-32 py-12 space-y-8">
    <h1 class="text-2xl font-semibold mb-4">📁 Projects</h1>
    <p class="text-gray-400 font-bold">{`<Imported from ${appState.settings.tool}>`}</p>
    
    <div class="grid w-5xl grid-cols-1 md:grid-cols-2 gap-8">
        {#if data.projects.length > 0}
            {#each data.projects as project}
                <div class="relative group">
                    <a 
                        href={project.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        class="block bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden hover:shadow-xl hover:shadow-gray-800/50 transition-all duration-300 border border-gray-800 hover:border-gray-700"
                    >
                        <div class="p-6 space-y-4">
                            <div class="flex items-start justify-between">
                                <h2 class="text-xl font-semibold text-gray-100 group-hover:text-gray-300 transition-colors line-clamp-2">
                                    {project.name}
                                </h2>
                                <span class="flex items-center text-gray-400 group-hover:text-gray-200 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </span>
                            </div>
                            
                            <p class="text-gray-300 line-clamp-3 text-sm">
                                {project.description}
                            </p>
                            
                            <div class="pt-4 flex items-center justify-between border-t border-gray-700">
                                <div class="flex items-center space-x-2 text-sm text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{formatDate(project.updatedAt)}</span>
                                </div>
                                
                                <div class="flex items-center space-x-1">
                                    <span class="px-2.5 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                                        {project.issues?.length || 0} issues
                                    </span>
                                </div>
                            </div>
                        </div>
                    </a>

                    <!-- Floating Issues Panel -->
                    {#if project.issues?.length > 0}
                        <div class="absolute left-[calc(100%-16px)] top-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10 min-w-[300px]">
                            <div class="bg-black rounded-xl shadow-xl border border-gray-800 p-4 ml-4 max-h-[640px] overflow-y-auto">
                                <div class="space-y-2">
                                    {#each project.issues as issue}
                                        <div class="relative group/issue">
                                            <a
                                                href={issue.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="block p-3 hover:bg-gray-600/50 rounded-lg transition-colors"
                                            >
                                                <h3 class="text-xs font-medium text-gray-300">{issue.title}</h3>
                                                <span class="text-xs text-gray-400 mt-1 block">
                                                    Updated: {formatDate(issue.updatedAt)}
                                                </span>
                                            </a>
                                            
                                            <!-- Third floating panel for description -->
                                            <div class="fixed transform -translate-x-[540px] translate-y-[-50%] opacity-0 invisible group-hover/issue:opacity-100 group-hover/issue:visible transition-all duration-300 z-30 w-[520px]">
                                                <div class="bg-black/90 backdrop-blur-sm rounded-xl shadow-xl border border-gray-800 p-8 max-h-[600px] overflow-y-auto mx-4">
                                                    <div class="flex items-center justify-between mb-6">
                                                        <h4 class="text-sm font-medium text-gray-200">{issue.title}</h4>
                                                        <span class="text-sm text-gray-400">
                                                            Updated: {formatDate(issue.updatedAt)}
                                                        </span>
                                                    </div>
                                                    <div class="prose prose-invert max-w-none">
                                                        {@html marked(issue.description || 'No description available')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        {:else}
            <div class="col-span-full text-center text-gray-400 py-12">
                No projects found
            </div>
        {/if}
    </div>
</div>
