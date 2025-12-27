<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { notificationStore } from '$lib/store'
    import { marked } from 'marked'
    import { page } from '$app/state'
    import { goto } from '$app/navigation'

    let selectedProjectId = $derived<string | null>(
        page.url.searchParams.get('id') ? String(page.url.searchParams.get('id')) : null
    )
    let searchQuery = $state('') as string
    let expandedIssueId = $state<number | null>(null)
    let updatingIssues = $state<Set<number>>(new Set())
    let deletingIssues = $state<Set<number>>(new Set())
    let showDeleteConfirm = $state<number | null>(null)
    let activeTab = $state<'open' | 'completed'>('open')

    // Derive selected project based on ID (safe against array mutations)
    let selectedProject = $derived(
        selectedProjectId 
            ? appState.projects.find((p: any) => p.id === selectedProjectId) 
            : null
    )

    const filteredProjects = $derived(searchQuery
        ? appState.projects.filter((p: any) => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : appState.projects
    )

    // Open issues - not completed
    let openIssues = $derived(
        selectedProject?.issues 
            ? [...selectedProject.issues]
                .filter((i: any) => !i.completedAt)
                .sort((a: any, b: any) => 
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                )
            : []
    )

    // Completed issues - have completedAt date
    let completedIssues = $derived(
        selectedProject?.issues 
            ? [...selectedProject.issues]
                .filter((i: any) => i.completedAt)
                .sort((a: any, b: any) => 
                    new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
                )
            : []
    )

    const formatDate = (dateString: string) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }

    const selectProject = (id: number) => {
        goto('/projects?id=' + id)
        expandedIssueId = null
        showDeleteConfirm = null
        activeTab = 'open'
    }

    const toggleIssueExpansion = (issueId: number) => {
        expandedIssueId = expandedIssueId === issueId ? null : issueId
    }

    async function updateIssueStatus(issueId: number, status: string) {
        if (updatingIssues.has(issueId)) return
        
        updatingIssues = new Set(updatingIssues).add(issueId)

        try {
            const response = await fetch(`/api/story/${issueId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tool: appState.settings.tool,
                    status: status
                })
            })

            const result = await response.json()

            if (response.ok) {
                notificationStore.addNotification('Story updated successfully', 'success')
                
                // Update the issue immediately
                if (selectedProject) {
                    const issueIndex = selectedProject.issues.findIndex((i: any) => i.id === issueId)
                    if (issueIndex !== -1) {
                        if (status === 'DONE') {
                            selectedProject.issues[issueIndex].completedAt = new Date().toISOString()
                        } else if (status === 'UNDONE') {
                            selectedProject.issues[issueIndex].completedAt = null
                        }
                    }
                }
                
                setTimeout(() => {
                    const newSet = new Set(updatingIssues)
                    newSet.delete(issueId)
                    updatingIssues = newSet
                }, 300)
            } else {
                notificationStore.addNotification(result.error || 'Failed to update story status', 'error')
                const newSet = new Set(updatingIssues)
                newSet.delete(issueId)
                updatingIssues = newSet
            }
        } catch (error) {
            console.error('Error updating story status:', error)
            notificationStore.addNotification('Failed to update story status', 'error')
            const newSet = new Set(updatingIssues)
            newSet.delete(issueId)
            updatingIssues = newSet
        }
    }

    function confirmDelete(issueId: number) {
        showDeleteConfirm = issueId
    }

    function cancelDelete() {
        showDeleteConfirm = null
    }

    async function deleteIssue(issueId: number) {
        if (deletingIssues.has(issueId)) return
        
        showDeleteConfirm = null
        deletingIssues = new Set(deletingIssues).add(issueId)

        try {
            const response = await fetch(`/api/story/${issueId}/status`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tool: appState.settings.tool
                })
            })

            if (response.ok) {
                notificationStore.addNotification('Story deleted', 'success')
                
                if (selectedProject) {
                    const issueIndex = selectedProject.issues.findIndex((i: any) => i.id === issueId)
                    if (issueIndex !== -1) {
                        selectedProject.issues.splice(issueIndex, 1)
                    }
                }
                
                setTimeout(() => {
                    const newSet = new Set(deletingIssues)
                    newSet.delete(issueId)
                    deletingIssues = newSet
                }, 600)
            } else {
                const result = await response.json()
                notificationStore.addNotification(result.error || 'Failed to delete story', 'error')
                const newSet = new Set(deletingIssues)
                newSet.delete(issueId)
                deletingIssues = newSet
            }
        } catch (error) {
            console.error('Error deleting story:', error)
            notificationStore.addNotification('Failed to delete story', 'error')
            const newSet = new Set(deletingIssues)
            newSet.delete(issueId)
            deletingIssues = newSet
        }
    }

    const copyIssue = (issue: any) => {
        const content = `${issue.title}\n\n${issue.description || ''}`
        try {
            navigator.clipboard.writeText(content)
            notificationStore.addNotification('Story copied to clipboard', 'success')
        } catch (err) {
            console.error('Failed to copy:', err)
            notificationStore.addNotification('Failed to copy story', 'error')
        }
    }
</script>

<div class="flex h-screen text-zinc-100 overflow-hidden font-sans max-w-7xl mx-auto">
    <!-- SIDEBAR -->
    <aside class="w-80 flex flex-col border-r border-zinc-800">
        <div class="p-4 border-b border-zinc-800">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-base font-semibold text-zinc-500 uppercase tracking-wider">Projects</h2>
                <span class="text-sm text-zinc-600">{appState.settings.tool}</span>
            </div>
            <div class="relative">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search..."
                    class="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
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
                                ? 'bg-zinc-800 text-white shadow-sm border-zinc-700' 
                                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
                        >
                            <div class="flex-1 min-w-0 pr-2">
                                <div class="font-medium text-sm truncate">{project.name}</div>
                            </div>
                        </button>
                    {/each}
                </div>
            {:else}
                <div class="p-6 text-center text-xs text-zinc-600">
                    No matching projects
                </div>
            {/if}
        </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="flex-1 flex flex-col min-w-0">
        {#if selectedProject}
            <!-- HEADER -->
            <header class="flex-none px-6 py-5 border-b border-zinc-800">
                <div class="flex items-start justify-between">
                    <div class="space-y-1 max-w-4xl">
                        <div class="flex items-center gap-3">
                            <h1 class="text-xl font-semibold text-white tracking-tight">
                                {selectedProject.name}
                            </h1>
                        </div>
                        <p class="text-sm text-zinc-400 leading-relaxed">
                            {selectedProject.description}
                        </p>
                    </div>
                    <a 
                        href={selectedProject.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="p-2 text-zinc-500 hover:text-purple-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Open external link"
                    >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
                
                <div class="mt-4 flex items-center text-xs text-zinc-500 font-mono">
                    <span>Updated {formatDate(selectedProject.updatedAt)}</span>
                </div>
            </header>

            <!-- TABS -->
            <div class="flex-none border-b border-zinc-800">
                <div class="px-6 flex gap-6">
                    <button
                        onclick={() => activeTab = 'open'}
                        class="relative px-1 py-3 text-sm font-medium transition-colors
                        {activeTab === 'open' 
                            ? 'text-purple-400' 
                            : 'text-zinc-500 hover:text-zinc-300'}"
                    >
                        Open
                        <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono
                        {activeTab === 'open' 
                            ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20' 
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}">
                            {openIssues.length}
                        </span>
                        {#if activeTab === 'open'}
                            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
                        {/if}
                    </button>
                    <button
                        onclick={() => activeTab = 'completed'}
                        class="relative px-1 py-3 text-sm font-medium transition-colors
                        {activeTab === 'completed' 
                            ? 'text-purple-400' 
                            : 'text-zinc-500 hover:text-zinc-300'}"
                    >
                        Completed
                        <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono
                        {activeTab === 'completed' 
                            ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20' 
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}">
                            {completedIssues.length}
                        </span>
                        {#if activeTab === 'completed'}
                            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
                        {/if}
                    </button>
                </div>
            </div>

            <!-- STORIES LIST -->
            <div class="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {#if activeTab === 'open'}
                    {#if openIssues.length > 0}
                        <div class="space-y-2 max-w-5xl mx-auto">
                            {#each openIssues as issue (issue.id)}
                                <div 
                                    class="group rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden
                                    {deletingIssues.has(issue.id) ? 'opacity-0 scale-95' : ''}"
                                >
                                    <div class="flex items-start gap-4 p-3">
                                        <button 
                                            onclick={() => updateIssueStatus(issue.id, "DONE")}
                                            disabled={updatingIssues.has(issue.id) || deletingIssues.has(issue.id)}
                                            class="mt-1 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 
                                            bg-transparent border-zinc-600 hover:border-purple-400 text-transparent hover:text-purple-400
                                            disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                    disabled={deletingIssues.has(issue.id)}
                                                >
                                                    <h4 class="text-base font-medium text-zinc-200 truncate hover:text-white transition-colors">
                                                        {issue.title}
                                                    </h4>
                                                </button>
                                                <div class="flex items-center gap-3">
                                                    <span class="text-sm text-zinc-600 font-mono whitespace-nowrap">
                                                        {formatDate(issue.updatedAt)}
                                                    </span>
                                                    
                                                    <button 
                                                        onclick={(e) => {
                                                            e.stopPropagation()
                                                            copyIssue(issue)
                                                        }}
                                                        disabled={deletingIssues.has(issue.id)}
                                                        class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-purple-400 transition-all duration-200 disabled:opacity-0"
                                                        title="Copy Story"
                                                    >
                                                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>

                                                    {#if showDeleteConfirm === issue.id}
                                                        <div class="flex items-center gap-2">
                                                            <button 
                                                                onclick={(e) => {
                                                                    e.stopPropagation()
                                                                    deleteIssue(issue.id)
                                                                }}
                                                                class="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                                                title="Confirm Delete"
                                                            >
                                                                Delete
                                                            </button>
                                                            <button 
                                                                onclick={(e) => {
                                                                    e.stopPropagation()
                                                                    cancelDelete()
                                                                }}
                                                                class="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
                                                                title="Cancel"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    {:else}
                                                        <button 
                                                            onclick={(e) => {
                                                                e.stopPropagation()
                                                                confirmDelete(issue.id)
                                                            }}
                                                            disabled={deletingIssues.has(issue.id)}
                                                            class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all duration-200 disabled:opacity-0"
                                                            title="Delete Story"
                                                        >
                                                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    {/if}

                                                    {#if issue.description}
                                                        <button
                                                            onclick={() => toggleIssueExpansion(issue.id)}
                                                            disabled={deletingIssues.has(issue.id)}
                                                            class="text-zinc-600 hover:text-zinc-400 transition-all duration-200 disabled:opacity-50"
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
                                                        <div class="prose prose-invert max-w-none text-zinc-500 text-sm">
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
                        <div class="flex flex-col items-center justify-center h-64 text-zinc-500">
                            <p class="text-sm">No open stories</p>
                        </div>
                    {/if}
                {:else}
                    {#if completedIssues.length > 0}
                        <div class="space-y-2 max-w-5xl mx-auto">
                            {#each completedIssues as issue (issue.id)}
                                <div 
                                    class="group rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden
                                    {deletingIssues.has(issue.id) ? 'opacity-0 scale-95' : ''}"
                                >
                                    <div class="flex items-start gap-4 p-3">
                                        <button 
                                            onclick={() => updateIssueStatus(issue.id, "UNDONE")}
                                            disabled={updatingIssues.has(issue.id) || deletingIssues.has(issue.id)}
                                            class="mt-1 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 
                                            bg-purple-400 border-purple-400 text-white
                                            disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Mark as incomplete"
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
                                                    disabled={deletingIssues.has(issue.id)}
                                                >
                                                    <h4 class="text-base font-medium text-zinc-200 truncate hover:text-white transition-colors">
                                                        {issue.title}
                                                    </h4>
                                                </button>
                                                <div class="flex items-center gap-3">
                                                    <span class="text-sm text-zinc-600 font-mono whitespace-nowrap">
                                                        {formatDate(issue.completedAt)}
                                                    </span>
                                                    
                                                    <button 
                                                        onclick={(e) => {
                                                            e.stopPropagation()
                                                            copyIssue(issue)
                                                        }}
                                                        disabled={deletingIssues.has(issue.id)}
                                                        class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-purple-400 transition-all duration-200 disabled:opacity-0"
                                                        title="Copy Story"
                                                    >
                                                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>

                                                    {#if showDeleteConfirm === issue.id}
                                                        <div class="flex items-center gap-2">
                                                            <button 
                                                                onclick={(e) => {
                                                                    e.stopPropagation()
                                                                    deleteIssue(issue.id)
                                                                }}
                                                                class="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                                                title="Confirm Delete"
                                                            >
                                                                Delete
                                                            </button>
                                                            <button 
                                                                onclick={(e) => {
                                                                    e.stopPropagation()
                                                                    cancelDelete()
                                                                }}
                                                                class="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
                                                                title="Cancel"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    {:else}
                                                        <button 
                                                            onclick={(e) => {
                                                                e.stopPropagation()
                                                                confirmDelete(issue.id)
                                                            }}
                                                            disabled={deletingIssues.has(issue.id)}
                                                            class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all duration-200 disabled:opacity-0"
                                                            title="Delete Story"
                                                        >
                                                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    {/if}

                                                    {#if issue.description}
                                                        <button
                                                            onclick={() => toggleIssueExpansion(issue.id)}
                                                            disabled={deletingIssues.has(issue.id)}
                                                            class="text-zinc-600 hover:text-zinc-400 transition-all duration-200 disabled:opacity-50"
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
                                                        <div class="prose prose-invert max-w-none text-zinc-500 text-sm">
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
                        <div class="flex flex-col items-center justify-center h-64 text-zinc-500">
                            <p class="text-sm">No completed stories</p>
                        </div>
                    {/if}
                {/if}
            </div>
        {:else}
            <!-- EMPTY STATE -->
            <div class="flex-1 flex flex-col items-center justify-center text-zinc-500 select-none">
                <div class="w-16 h-16 mb-4 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <svg class="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        background: #374151; 
        border-radius: 99px;
    }
    :global(.scrollbar-thin::-webkit-scrollbar-thumb:hover) {
        background: #4b5563;
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
</style>
