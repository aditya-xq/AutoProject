<script lang="ts">
    import { ChatUX } from "$lib/components";
    import { appState } from "$lib/state.svelte";
    import { notificationStore } from "$lib/store";
    import { marked } from "marked";

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
        if (!response.ok || result.status < 200 || result.status >= 300) {
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
        if (!response.ok || result.status < 200 || result.status >= 300) {
            appState.isLoading = false;
            notificationStore.addNotification(result.data || 'Failed to create project. Please try again', 'error');
            return;
        }
    }
</script>

<div class="container mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
    <div class="flex justify-center my-16">
        <h1 class="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent animate-gradient-x tracking-tight">
            Your zero to one start line
        </h1>
    </div>

    <!-- Requirements section -->
    <div class="flex flex-col space-y-6">
        <label for="requirements" class="text-lg font-semibold text-purple-400">What to build?</label>
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
                            onclick={handleProjectCreation}
                            class="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                            </svg>
                            {`Create ${appState.settings.tool} Project`}
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