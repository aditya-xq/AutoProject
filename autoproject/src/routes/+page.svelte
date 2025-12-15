<script lang="ts">
    import { ChatUX, ProjectSelectionModal } from "$lib/components"
    import { appState } from "$lib/state.svelte"
    import { notificationStore } from "$lib/store"
    import { marked } from "marked"

    let showProjectModal = $state(false)

    let generatePrdDisabled = $derived(!appState.requirements.trim())

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text)
            notificationStore.addNotification('PRD copied to clipboard!', 'success')
        } catch {
            notificationStore.addNotification('Failed to copy PRD', 'error')
        }
    }

    function removeMarkdownCodeBlocks(content: string): string {
        return content.replace(/```markdown\n/g, '').replace(/```markdown/g, '')
    }

    async function handleUserStoryGeneration() {
        appState.isLoading = true

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prd: appState.prd,
                settings: appState.settings,
                isJsonMode: true
            })
        })

        const result = await response.json()
        appState.isLoading = false

        if (response.ok) {
            appState.projectDetails = result.data
            notificationStore.addNotification('User stories generated successfully', 'success')
        } else {
            notificationStore.addNotification(
                result.data || 'Failed to generate user stories',
                'error'
            )
        }
    }

    async function handleProjectCreation() {
        appState.isLoading = true

        const response = await fetch('/api/project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectDetails: appState.projectDetails,
                prd: appState.prd,
                tool: appState.settings.tool
            })
        })

        const result = await response.json()
        appState.isLoading = false

        if (response.ok) {
            notificationStore.addNotification('Project created successfully', 'success')
        } else {
            notificationStore.addNotification(
                result.data || 'Failed to create project',
                'error'
            )
        }
    }

    async function handleProjectUpdate() {
        appState.isLoading = true

        const response = await fetch('/api/project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectDetails: appState.projectDetails,
                prd: appState.prd,
                tool: appState.settings.tool,
                projectId: appState.activeProject?.id
            })
        })

        const result = await response.json()
        appState.isLoading = false

        if (response.ok) {
            notificationStore.addNotification('Project updated successfully', 'success')
        } else {
            notificationStore.addNotification(
                result.data || 'Failed to update project',
                'error'
            )
        }
    }
</script>

<ProjectSelectionModal bind:isOpen={showProjectModal} />

<div class="container mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
    {#if !appState.activeProject?.name}
        <!-- DO NOT TOUCH -->
        <div class="flex justify-center my-14">
            <h1 class="text-6xl font-bold bg-linear-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent animate-gradient-x tracking-tight">
                Your zero to one start line
            </h1>
        </div>
    {/if}

    <!-- Requirements section -->
    <div class="flex flex-col space-y-6">
        <div class="flex justify-end mb-6">
            <button
                class="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-purple-500 to-orange-500 text-white text-sm rounded-md hover:opacity-90 transition-all duration-200"
                onclick={() => showProjectModal = true}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                </svg>
                Import Project
            </button>
        </div>
        {#if appState.activeProject?.name}
            <!-- Active project -->
            <div class="flex items-center justify-between p-4
                        bg-neutral-900 border border-neutral-800 rounded-lg">
                <div class="flex items-center gap-4">
                    <div class="p-2 bg-neutral-800 rounded-md">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-300" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-white">
                            {appState.activeProject.name}
                        </h3>
                        <p class="text-xs text-neutral-400">
                            {appState.activeProject.description}
                        </p>
                    </div>
                </div>
                <button
                    class="text-sm text-red-400 hover:text-red-300 transition"
                    onclick={() => {
                        appState.activeProject = {}
                        appState.projectDetails.userStories = []
                        appState.prd = ''
                        appState.requirements = ''
                    }}
                >
                    Clear
                </button>
            </div>
        {/if}

        <ChatUX generatePrdDisabled={generatePrdDisabled} />

        <div class={`grid gap-6 ${appState.projectDetails.userStories.length > 0 ? 'lg:grid-cols-5' : ''}`}>

            {#if appState.prd}
                <!-- PRD -->
                <div class={`flex flex-col gap-4 ${appState.projectDetails.userStories.length > 0 ? 'lg:col-span-3' : ''}`}>
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm font-medium text-green-400">PRD</h2>

                        <div class="flex gap-2">
                            <button
                                onclick={() => copyToClipboard(appState.prd)}
                                class="px-3 py-1.5 text-sm
                                       bg-neutral-800 text-neutral-200
                                       border border-neutral-700 rounded-md
                                       hover:bg-neutral-700 transition"
                            >
                                Copy
                            </button>

                            <button
                                onclick={handleUserStoryGeneration}
                                class="px-3 py-1.5 text-sm
                                       bg-purple-600 text-white
                                       rounded-md hover:bg-purple-500 transition"
                            >
                                Generate Stories
                            </button>
                        </div>
                    </div>

                    <div
                        class="prose prose-invert max-w-none
                               p-6 bg-neutral-950
                               border border-neutral-800 rounded-lg"
                    >
                        {@html marked(removeMarkdownCodeBlocks(appState.prd))}
                    </div>
                </div>
            {/if}

            {#if appState.projectDetails.userStories.length > 0}
                <!-- User Stories -->
                <div class="flex flex-col gap-4 lg:col-span-2">
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm font-medium text-yellow-400">
                            User Stories ({appState.projectDetails.userStories.length})
                        </h2>

                        <button
                            onclick={appState.activeProject.name ? handleProjectUpdate : handleProjectCreation}
                            class="px-3 py-1.5 text-sm
                                   bg-purple-600 text-white
                                   rounded-md hover:bg-purple-500 transition"
                        >
                            {appState.activeProject.name ? 'Update' : 'Create'} {appState.settings.tool}
                        </button>
                    </div>

                    <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                        {#each appState.projectDetails.userStories as userStory}
                            <details
                                class="bg-neutral-900 border border-neutral-800 rounded-lg"
                            >
                                <summary
                                    class="cursor-pointer p-4
                                           hover:bg-neutral-800 transition"
                                >
                                    {userStory.title}
                                </summary>
                                <div class="p-4 pt-2 text-sm text-neutral-300">
                                    {@html marked(removeMarkdownCodeBlocks(userStory.description))}
                                </div>
                            </details>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
