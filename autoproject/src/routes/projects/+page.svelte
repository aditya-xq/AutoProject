<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { notificationStore } from '$lib/store'
    import { page } from '$app/state'
    import { goto } from '$app/navigation'
    import { IssueItem, ProjectHeader, ProjectList, ProjectTabs } from '$lib/components/Projects'

    type ProjectTab = 'open' | 'completed'
    type IssueStatus = 'DONE' | 'UNDONE'

    let selectedProjectId = $derived(page.url.searchParams.get('id'))
    let searchQuery = $state('')
    let expandedIssueId = $state<string | null>(null)
    let updatingIssues = $state<Set<string>>(new Set())
    let deletingIssues = $state<Set<string>>(new Set())
    let showDeleteConfirm = $state<string | null>(null)
    let activeTab = $state<ProjectTab>('open')

    const getTime = (value: string | null | undefined) => (value ? new Date(value).getTime() : 0)

    let selectedProject = $derived(
        selectedProjectId
            ? appState.projects.find((project: any) => String(project.id) === selectedProjectId)
            : null
    )

    let openIssues = $derived(
        selectedProject?.issues
            ? [...selectedProject.issues]
                  .filter((issue: any) => !issue.completedAt)
                  .sort((a: any, b: any) => getTime(b.updatedAt) - getTime(a.updatedAt))
            : []
    )

    let completedIssues = $derived(
        selectedProject?.issues
            ? [...selectedProject.issues]
                  .filter((issue: any) => issue.completedAt)
                  .sort((a: any, b: any) => getTime(b.completedAt) - getTime(a.completedAt))
            : []
    )

    const addIssueToSet = (set: Set<string>, issueId: string) => {
        const nextSet = new Set(set)
        nextSet.add(issueId)
        return nextSet
    }

    const removeIssueFromSet = (set: Set<string>, issueId: string) => {
        const nextSet = new Set(set)
        nextSet.delete(issueId)
        return nextSet
    }

    const selectProject = (id: string) => {
        goto(`/projects?id=${encodeURIComponent(id)}`)
        expandedIssueId = null
        showDeleteConfirm = null
        activeTab = 'open'
    }

    const toggleIssueExpansion = (issueId: string) => {
        expandedIssueId = expandedIssueId === issueId ? null : issueId
    }

    async function updateIssueStatus(issueId: string, status: IssueStatus) {
        if (updatingIssues.has(issueId)) return

        updatingIssues = addIssueToSet(updatingIssues, issueId)

        try {
            const response = await fetch(`/api/story/${issueId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tool: appState.settings.tool,
                    status
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update story status')
            }

            notificationStore.addNotification('Story updated successfully', 'success')

            if (selectedProject?.issues) {
                const issueIndex = selectedProject.issues.findIndex((issue: any) => String(issue.id) === issueId)
                if (issueIndex !== -1) {
                    if (status === 'DONE') {
                        const completedAt = new Date().toISOString()
                        selectedProject.issues[issueIndex].completedAt = completedAt
                    } else {
                        selectedProject.issues[issueIndex].completedAt = null
                    }
                }
            }

            setTimeout(() => {
                updatingIssues = removeIssueFromSet(updatingIssues, issueId)
            }, 300)
        } catch (error) {
            console.error('Error updating story status:', error)
            notificationStore.addNotification(
                error instanceof Error ? error.message : 'Failed to update story status',
                'error'
            )
            updatingIssues = removeIssueFromSet(updatingIssues, issueId)
        }
    }

    function confirmDelete(issueId: string) {
        showDeleteConfirm = issueId
    }

    function cancelDelete() {
        showDeleteConfirm = null
    }

    async function deleteIssue(issueId: string) {
        if (deletingIssues.has(issueId)) return

        showDeleteConfirm = null
        deletingIssues = addIssueToSet(deletingIssues, issueId)

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

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error || 'Failed to delete story')
            }

            notificationStore.addNotification('Story deleted', 'success')

            if (selectedProject?.issues) {
                const issueIndex = selectedProject.issues.findIndex((issue: any) => String(issue.id) === issueId)
                if (issueIndex !== -1) {
                    selectedProject.issues.splice(issueIndex, 1)
                }
            }

            if (expandedIssueId === issueId) {
                expandedIssueId = null
            }

            setTimeout(() => {
                deletingIssues = removeIssueFromSet(deletingIssues, issueId)
            }, 600)
        } catch (error) {
            console.error('Error deleting story:', error)
            notificationStore.addNotification(
                error instanceof Error ? error.message : 'Failed to delete story',
                'error'
            )
            deletingIssues = removeIssueFromSet(deletingIssues, issueId)
        }
    }

    async function copyIssue(issue: any) {
        const content = `${issue.title}\n\n${issue.description || ''}`
        try {
            await navigator.clipboard.writeText(content)
            notificationStore.addNotification('Story copied to clipboard', 'success')
        } catch (error) {
            console.error('Failed to copy:', error)
            notificationStore.addNotification('Failed to copy story', 'error')
        }
    }
</script>

<div class="flex h-screen text-zinc-100 overflow-hidden font-sans max-w-7xl mx-auto">
    <aside class="w-80 flex flex-col border-r border-zinc-800">
        <ProjectList bind:searchQuery {selectedProjectId} onSelectProject={selectProject} />
    </aside>

    <main class="flex-1 flex flex-col min-w-0">
        {#if selectedProject}
            <ProjectHeader {selectedProject} />

            <ProjectTabs
                {activeTab}
                openCount={openIssues.length}
                completedCount={completedIssues.length}
                onSetActiveTab={(tab) => (activeTab = tab)}
            />

            <div class="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {#if activeTab === 'open'}
                    {#if openIssues.length > 0}
                        <div class="space-y-2 max-w-5xl mx-auto">
                            {#each openIssues as issue (issue.id)}
                                <IssueItem
                                    {issue}
                                    {expandedIssueId}
                                    {updatingIssues}
                                    {deletingIssues}
                                    {showDeleteConfirm}
                                    completionAction="DONE"
                                    dateField="updatedAt"
                                    onToggleExpansion={toggleIssueExpansion}
                                    onUpdateStatus={updateIssueStatus}
                                    onRequestDelete={confirmDelete}
                                    onConfirmDelete={deleteIssue}
                                    onCancelDelete={cancelDelete}
                                    onCopy={copyIssue}
                                />
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
                                <IssueItem
                                    {issue}
                                    {expandedIssueId}
                                    {updatingIssues}
                                    {deletingIssues}
                                    {showDeleteConfirm}
                                    completionAction="UNDONE"
                                    dateField="completedAt"
                                    onToggleExpansion={toggleIssueExpansion}
                                    onUpdateStatus={updateIssueStatus}
                                    onRequestDelete={confirmDelete}
                                    onConfirmDelete={deleteIssue}
                                    onCancelDelete={cancelDelete}
                                    onCopy={copyIssue}
                                />
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
</style>
