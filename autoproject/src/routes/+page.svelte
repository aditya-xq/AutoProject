<script lang="ts">
    import { ChatUX, ProjectSelectionModal } from "$lib/components";
    import { appState } from "$lib/state.svelte";
    import { notificationStore } from "$lib/store";
    import { marked } from "marked";

    let showProjectModal = $state(false);

    let generatePrdDisabled = $derived(!appState.requirements.trim())

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            notificationStore.addNotification('PRD copied to clipboard!', 'success');
        } catch (err) {
            notificationStore.addNotification('Failed to copy PRD', 'error');
        }
    }

    function removeMarkdownCodeBlocks(content: string): string {
        return content.replace(/```markdown\n/g, '').replace(/```markdown/g, '');
    }

    async function handleUserStoryGeneration() {
        appState.isLoading = true;
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                prd: appState.prd,
                settings: appState.settings,
                isJsonMode: true,
            })
        });
        
        const result = await response.json();

        if (response.ok) {
            appState.isLoading = false;
            appState.projectDetails = result.data;
            notificationStore.addNotification('User stories generated successfully', 'success');
            return;
        }
        if (!response.ok || !result.success) {
            appState.isLoading = false;
            notificationStore.addNotification(result.data || 'Failed to generate user stories. Please try again', 'error');
            return;
        }
    }

    async function handleProjectCreation() {
        appState.isLoading = true;
        const response = await fetch('/api/project', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                projectDetails: appState.projectDetails,
                prd: appState.prd,
                tool: appState.settings.tool,
            })
        });
        const result = await response.json();
        if (response.ok) {
            appState.isLoading = false;
            notificationStore.addNotification('Project created successfully', 'success');
            return;
        }
        if (!response.ok || !result.success) {
            appState.isLoading = false;
            notificationStore.addNotification(result.data || 'Failed to create project. Please try again', 'error');
            return;
        }
    }

    async function handleProjectUpdate() {
        appState.isLoading = true;
        const response = await fetch('/api/project', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                projectDetails: appState.projectDetails,
                prd: appState.prd,
                tool: appState.settings.tool,
                projectId: appState.activeProject?.id,
            })
        });
        const result = await response.json();
        if (response.ok) {
            appState.isLoading = false;
            notificationStore.addNotification('Project updated successfully', 'success');
            return;
        }
        if (!response.ok || !result.success) {
            appState.isLoading = false;
            notificationStore.addNotification(result.data || 'Failed to update project. Please try again', 'error');
            return;
        }
    }
</script>

<ProjectSelectionModal bind:isOpen={showProjectModal}/>

<div class="container mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
    {#if !appState.activeProject?.name}
        <div class="flex justify-center my-16">
            <h1 class="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent animate-gradient-x tracking-tight">
                Your zero to one start line
            </h1>
        </div>
    {/if}

    <!-- Requirements section -->
    <div class="flex flex-col space-y-6">
        <div class="flex justify-end mb-6">
            <button
                class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-all duration-200"
                onclick={() => showProjectModal = true}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                </svg>
                Import Project
            </button>
        </div>
        {#if appState.activeProject?.name}
            <div class="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-orange-500/10 border border-purple-500/20 rounded-lg backdrop-blur-sm">
                <div class="flex items-center space-x-4">
                    <div class="p-2 bg-purple-500/20 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-white">{appState.activeProject.name}</h3>
                        <p class="text-sm text-gray-400">{appState.activeProject.description}</p>
                    </div>
                </div>
                <button 
                    class="px-3 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    onclick={() => {
                        appState.activeProject = {};
                        appState.projectDetails.userStories = [];
                        appState.prd = '';
                        appState.requirements = '';
                    }}
                >
                    Clear Project
                </button>
            </div>
        {/if}
        <ChatUX generatePrdDisabled={generatePrdDisabled}/>
        
        <!-- Updated grid layout -->
        <div class={`grid transition-all duration-500 ${appState.projectDetails.userStories.length > 0 ? 'lg:grid-cols-5' : 'grid-cols-1'} gap-6`}>
            <!-- PRD Box with enhanced styling -->
            {#if appState.prd}
                <div class={`flex flex-col space-y-4 ${appState.projectDetails.userStories.length > 0 ? 'lg:col-span-3' : ''}`}>
                    <div class="flex items-center justify-between">
                        <h2 class="text-xl font-semibold text-green-500">PRD</h2>
                        <div class="flex gap-3">
                            <button
                                onclick={() => copyToClipboard(appState.prd)}
                                class="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                </svg>
                                Copy
                            </button>
                            <button
                                onclick={handleUserStoryGeneration}
                                class="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                                </svg>
                                Generate User Stories
                            </button>
                        </div>
                    </div>
                    <div 
                        id="prd-display" 
                        class="prose prose-invert max-w-none w-full grow p-6 bg-gray-950/50 backdrop-blur-sm border border-green-500/30 rounded-xl shadow-lg"
                    >
                        {@html marked(removeMarkdownCodeBlocks(appState.prd))}
                    </div>
                </div>
            {/if}

            <!-- User Stories section -->
            {#if appState.projectDetails.userStories.length > 0}
                <div class="flex flex-col space-y-4 lg:col-span-2">
                    <div class="flex items-center justify-between">
                        <h2 class="text-xl font-semibold text-yellow-500">User Stories {`(${appState.projectDetails.userStories.length})`}</h2>
                        <button
                            onclick={appState.activeProject.name ? handleProjectUpdate : handleProjectCreation}
                            class="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                            </svg>
                            {`${appState.activeProject.name ? 'Update' : 'Create'} ${appState.settings.tool} Project`}
                        </button>
                    </div>
                    <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                        {#each appState.projectDetails.userStories as userStory}
                            <details class="group bg-gray-800/50 backdrop-blur-sm text-white border border-purple-500/20 rounded-xl">
                                <summary class="cursor-pointer p-4 rounded-xl hover:bg-gray-700/50 transition-all duration-200">{userStory.title}</summary>
                                <div class="p-4 pt-2">
                                    <p class="text-gray-300">{@html marked(removeMarkdownCodeBlocks(userStory.description))}</p>
                                </div>
                            </details>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>