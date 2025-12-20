<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { marked } from 'marked'

    // ------------------------------------------------------------------
    // STATE & DERIVATIVES
    // ------------------------------------------------------------------
    
    let selectedProjectId = $state<number | null>(null)
    let searchQuery = $state('')
    let expandedIssueId = $state<number | null>(null)
    let completingIssues = $state<Set<number>>(new Set())

    // Derive selected project based on ID (safe against array mutations)
    let selectedProject = $derived(
        selectedProjectId 
            ? appState.projects.find((p: any) => p.id === selectedProjectId) 
            : null
    )

    // Filter logic
    const filteredProjects = $derived(searchQuery
        ? appState.projects.filter((p: any) => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : appState.projects
    )

    // Only show open issues (filter out completed)
    let openIssues = $derived(
        selectedProject?.issues 
            ? [...selectedProject.issues]
                .filter((i: any) => !i.completedAt)
                .sort((a: any, b: any) => 
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                )
            : []
    )

    // ------------------------------------------------------------------
    // LOGIC & HANDLERS
    // ------------------------------------------------------------------

    const formatDate = (dateString: string) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }

    const selectProject = (id: number) => {
        selectedProjectId = id
        expandedIssueId = null // Reset expanded issue when switching projects
    }

    const toggleIssueExpansion = (issueId: number) => {
        expandedIssueId = expandedIssueId === issueId ? null : issueId
    }

    const toggleIssueComplete = (issueId: number) => {
        // Add to completing set for animation
        completingIssues.add(issueId)
        completingIssues = completingIssues // Trigger reactivity
        
        // TODO: Call your API to mark issue as complete
        // For now, we'll just animate it out after a delay
        setTimeout(() => {
            completingIssues.delete(issueId)
            completingIssues = completingIssues
            // The issue will be filtered out on next data fetch
        }, 600)
    }
</script>

<div class="flex h-screen text-gray-100 overflow-hidden font-sans max-w-7xl mx-auto">
    <!-- SIDEBAR -->
    <aside class="w-80 flex flex-col border-r border-gray-800">
        <div class="p-4 border-b border-gray-800">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</h2>
                <span class="text-[10px] text-gray-600">{appState.settings.tool}</span>
            </div>
            <div class="relative">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search..."
                    class="w-full bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-400 transition-colors"
                />
            </div>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-thin">
            {#if filteredProjects.length > 0}
                <div class="p-2 space-y-1">
                    {#each filteredProjects as project (project.id)}
                        <button 
                            onclick={() => selectProject(project.id)}
                            class="group w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 border border-transparent
                            {selectedProjectId === project.id 
                                ? 'bg-gray-800 text-white shadow-sm border-gray-700' 
                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}"
                        >
                            <div class="flex-1 min-w-0 pr-2">
                                <div class="font-medium text-sm truncate">{project.name}</div>
                            </div>
                            
                            {#if selectedProjectId === project.id}
                                <button 
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        // TODO: Add delete project handler
                                    }}
                                    class="text-gray-500 hover:text-red-400 p-1 transition-colors"
                                    title="Delete Project"
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            {/if}
                        </button>
                    {/each}
                </div>
            {:else}
                <div class="p-6 text-center text-xs text-gray-600">
                    No matching projects
                </div>
            {/if}
        </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="flex-1 flex flex-col min-w-0">
        {#if selectedProject}
            <!-- HEADER -->
            <header class="flex-none px-6 py-5 border border-gray-800">
                <div class="flex items-start justify-between">
                    <div class="space-y-1 max-w-2xl">
                        <div class="flex items-center gap-3">
                            <h1 class="text-xl font-semibold text-white tracking-tight">
                                {selectedProject.name}
                            </h1>
                            <span class="px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 border border-gray-700">
                                {openIssues.length}
                            </span>
                        </div>
                        <p class="text-sm text-gray-400 leading-relaxed truncate">
                            {selectedProject.description}
                        </p>
                    </div>
                    <a 
                        href={selectedProject.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="p-2 text-gray-500 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Open external link"
                    >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
                
                <div class="mt-4 flex items-center text-xs text-gray-500 font-mono">
                    <span>Updated {formatDate(selectedProject.updatedAt)}</span>
                </div>
            </header>

            <!-- STORIES LIST -->
            <div class="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {#if openIssues.length > 0}
                    <div class="space-y-2 max-w-5xl mx-auto">
                        {#each openIssues as issue (issue.id)}
                            <div 
                                class="group rounded-lg border border-gray-800 hover:border-gray-700 transition-all duration-300 overflow-hidden
                                {completingIssues.has(issue.id) ? 'completing' : ''}"
                            >
                                <div class="flex items-start gap-4 p-3">
                                    <button 
                                        onclick={() => toggleIssueComplete(issue.id)}
                                        class="mt-1 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 bg-transparent border-gray-600 hover:border-purple-400 text-transparent hover:text-purple-400"
                                        title="Mark as complete"
                                    >
                                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </button>

                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center justify-between mb-1">
                                            <button
                                                onclick={() => toggleIssueExpansion(issue.id)}
                                                class="flex-1 text-left pr-4"
                                            >
                                                <h4 class="text-sm font-medium text-gray-200 truncate hover:text-white transition-colors">
                                                    {issue.title}
                                                </h4>
                                            </button>
                                            <div class="flex items-center gap-3">
                                                <span class="text-[10px] text-gray-600 font-mono whitespace-nowrap">
                                                    {formatDate(issue.updatedAt)}
                                                </span>
                                                
                                                <button 
                                                    onclick={(e) => {
                                                        e.stopPropagation()
                                                        // TODO: Add delete issue handler
                                                    }}
                                                    class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all duration-200"
                                                    title="Delete Story"
                                                >
                                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>

                                                {#if issue.description}
                                                    <button
                                                        onclick={() => toggleIssueExpansion(issue.id)}
                                                        class="text-gray-600 hover:text-gray-400 transition-all duration-200"
                                                        title={expandedIssueId === issue.id ? "Collapse" : "Expand"}
                                                    >
                                                        <svg 
                                                            class="w-4 h-4 transition-transform duration-300 {expandedIssueId === issue.id ? 'rotate-180' : ''}" 
                                                            fill="none" 
                                                            viewBox="0 0 24 24" 
                                                            stroke="currentColor"
                                                        >
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                {/if}
                                            </div>
                                        </div>
                                        
                                        {#if issue.description}
                                            <div class="accordion-content {expandedIssueId === issue.id ? 'expanded' : ''}">
                                                <div class="accordion-inner pt-2">
                                                    <div class="prose prose-invert max-w-none text-gray-500 text-xs">
                                                        {@html marked(issue.description)}
                                                    </div>
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="flex flex-col items-center justify-center h-64 text-gray-500">
                        <p class="text-sm">No open stories</p>
                    </div>
                {/if}
            </div>
        {:else}
            <!-- EMPTY STATE -->
            <div class="flex-1 flex flex-col items-center justify-center text-gray-500 select-none">
                <div class="w-16 h-16 mb-4 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                    <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                </div>
                <p class="text-sm">Select a project to view details</p>
            </div>
        {/if}
    </main>
</div>

<style>
    /* Scrollbar styling */
    :global(.scrollbar-thin::-webkit-scrollbar) {
        width: 4px;
    }
    :global(.scrollbar-thin::-webkit-scrollbar-track) {
        background: transparent;
    }
    :global(.scrollbar-thin::-webkit-scrollbar-thumb) {
        background: #374151; /* gray-700 */
        border-radius: 99px;
    }
    :global(.scrollbar-thin::-webkit-scrollbar-thumb:hover) {
        background: #4b5563; /* gray-600 */
    }

    /* Accordion animation */
    .accordion-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .accordion-content.expanded {
        max-height: 500px;
    }

    .accordion-inner {
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .accordion-content.expanded .accordion-inner {
        opacity: 1;
        transform: translateY(0);
    }

    /* Completion animation */
    .completing {
        animation: completeAndFade 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes completeAndFade {
        0% {
            opacity: 1;
            transform: translateX(0) scale(1);
        }
        50% {
            opacity: 0.5;
            transform: translateX(8px) scale(0.98);
        }
        100% {
            opacity: 0;
            transform: translateX(20px) scale(0.95);
            max-height: 0;
            margin: 0;
            padding: 0;
            border: none;
        }
    }
</style>
