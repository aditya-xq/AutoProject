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

<div class="bg-gray-950 text-gray-100 min-h-screen flex flex-col px-4 sm:px-8 md:px-16 lg:px-32 xl:px-32 py-8 space-y-6">
    <!-- Note to setup settings before getting started -->
    <div class="bg-gray-900 text-gray-300 p-4 rounded-lg max-w-4xl">
        <span>🚨 Don't forget to configure your <a href="/settings" class="text-violet-400 transition-colors">settings page</a> before getting started. AutoProject can generate starter PRDs and user stories but remember that it is prone to errors.</span>
    </div>

    <!-- Requirements Box -->
    <div class="flex flex-col w-full max-w-6xl space-y-4 max-sm:px-4">
        <label for="requirements" class="block font-semibold text-lg md:text-2xl text-purple-400">Requirement</label>
        <ChatUX generatePrdDisabled={generatePrdDisabled}/>
        <div class={`w-full max-w-6xl mx-auto grid transition-all duration-500 ${appState.projectDetails.userStories.length > 0 ? 'grid-cols-5' : 'grid-cols-1'} gap-4 rounded-lg`}>
            <!-- PRD Box -->
            {#if appState.prd}
                <div class={`flex flex-col space-y-4 ${appState.projectDetails.userStories.length > 0 ? 'col-span-3' : ''}`}>
                    <div class="flex items-center gap-4">
                        <label for="prd-display" class="block grow font-semibold text-lg md:text-xl text-green-500">PRD</label>
                        <button
                            onclick={() => copyToClipboard(appState.prd)}
                            class="flex mt-1 items-center gap-2 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                            Copy
                        </button>
                        <!-- a button to generate user stories -->
                        <button
                            onclick={handleUserStoryGeneration}
                            class="flex mt-1 items-center gap-2 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                            </svg>
                            Generate User Stories
                        </button>
                    </div>
                    <div 
                        id="prd-display" 
                        class="prose prose-invert max-w-none w-full grow p-6 bg-gray-950 border border-green-500 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                        {@html marked(removeMarkdownCodeBlocks(appState.prd))}
                    </div>
                </div>
            {/if}
        
            <!-- User Stories Box -->
            {#if appState.projectDetails.userStories.length > 0}
                <div class="flex flex-col space-y-4 px-2 col-span-2">
                    <div class="flex items-center gap-4">
                        <label for="user-stories" class="block grow text-lg md:text-xl font-semibold text-yellow-500">User Stories {`(${appState.projectDetails.userStories.length})`}</label>
                        <!-- a button to push to the PM tool -->
                        <button
                            onclick={handleProjectCreation}
                            class="flex mt-1 items-center gap-2 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                            </svg>
                            {`Create new project on ${appState.settings.tool}`}
                        </button>
                    </div>
                    <div id="user-stories" class="w-full overflow-auto rounded-lg p-2">
                        {#each appState.projectDetails.userStories as userStory}
                            <details class="space-y-2 p-2 rounded-lg border-t border-gray-600">
                                <summary class="cursor-pointer text-white p-2 rounded-lg hover:bg-gray-700 transition-all duration-200">{userStory.title}</summary>
                                <div class="px-2">
                                    <p class="mb-4 text-sm">{@html marked(removeMarkdownCodeBlocks(userStory.description))}</p>
                                </div>
                            </details>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
