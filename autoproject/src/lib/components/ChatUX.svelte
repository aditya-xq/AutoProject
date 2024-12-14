<script lang="ts">
    import { PRD_PROMPT } from '$lib';
    import { appState } from '$lib/state.svelte';
    import { notificationStore } from '$lib/store';
    import { starterPrompts } from '$lib/utils/config';
    import { useChat } from '@ai-sdk/svelte';
    import { marked } from 'marked';

    export let generatePrdDisabled = false;

    const { input, handleSubmit, messages, setMessages, stop } = useChat({
        api: '/api/chat',
        body: {
            settings: appState.settings,
        }
    });

    // Configure marked for secure rendering
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    let promptSuffix = '';
    let prompt = '';

    $: if ($messages.length > 1) {
        appState.isLoading = false;
        const lastMessage = $messages[$messages.length - 1];
        if (lastMessage.role === 'assistant' && appState.promptType === 'prd') {
            appState.prd = lastMessage.content;
        }
    }

    function handleSubmitHandler() {
        appState.isLoading = true;
        appState.promptType = 'prd';
        promptSuffix = PRD_PROMPT(appState.settings.prdType);
        prompt = `${appState.requirements} ${promptSuffix}`;
        setMessages([]);
        input.set(prompt);
        handleSubmit();
    }

    async function handleUserStoryGeneration() {
        appState.isLoading = true;
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prd: appState.prd,
                    settings: appState.settings,
                    promptType: 'userStory',
                })
            });
            
            const result = await response.json();
            
            if (result.status === 200) {
                appState.userStories = result.data;
                notificationStore.addNotification('User stories generated successfully', 'success');
            } else {
                notificationStore.addNotification(result.error || 'Failed to generate user stories', 'error');
            }
        } catch (error) {
            notificationStore.addNotification('Failed to generate user stories', 'error');
        } finally {
            appState.isLoading = false;
        }
    }

    function handleProjectCreation() {
        notificationStore.addNotification('Project creation not implemented yet', 'error');
    }

    function clearContent() {
        appState.requirements = '';
        appState.promptType = 'prd';
        appState.prd = '';
        appState.userStories = [];
        setMessages([]);
        input.set('');
        stop();
        notificationStore.addNotification('All content cleared', 'success');
    }

    function handleStarterClick(requirements: string) {
        appState.requirements = requirements;
        handleSubmitHandler();
    }

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            notificationStore.addNotification('PRD copied to clipboard!', 'success');
        } catch (err) {
            notificationStore.addNotification('Failed to copy PRD', 'error');
        }
    }
</script>

<div class="flex">
    <input
        id="requirements" 
        autocomplete="off"
        class="my-2 flex-grow p-4 bg-gray-950 border border-purple-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
        bind:value={appState.requirements}
        placeholder="E.g. A webapp for xyz usecase..."
        aria-label="Enter Project Requirements"
        on:keydown={(e) => e.key === 'Enter' && handleSubmitHandler()}
    />
    <button
        id="generate-prd"
        aria-label="Generate PRD"
        disabled={generatePrdDisabled}
        on:click={handleSubmitHandler}
        class="my-2 mx-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
        Generate PRD
    </button>

    <button
        on:click={clearContent}
        class="my-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-sm transition-all duration-200"
        aria-label="Clear Content"
    >
        Clear All
    </button>

</div>
<!-- Starter Prompts -->
{#if !appState.prd}
    <div class="space-y-2">
        <p class="text-sm text-gray-400">Explore ideas:</p>
        <div class="grid grid-cols-5 gap-4">
            {#each starterPrompts as { label, requirements }}
                <button
                    on:click={() => handleStarterClick(requirements)}
                    class="p-3 rounded-lg border cursor-pointer transition-colors duration-200 border-gray-600 hover:border-gray-400">
                    {label}
                </button>
            {/each}
        </div>
    </div>
{/if}
<div class={`w-full max-w-6xl mx-auto grid transition-all duration-500 ${appState.userStories.length > 0 ? 'grid-cols-5' : 'grid-cols-1'} gap-4 rounded-lg`}>
    <!-- PRD Box -->
    {#if appState.prd}
        <div class={`flex flex-col space-y-4 ${appState.userStories.length > 0 ? 'col-span-3' : ''}`}>
            <div class="flex items-center gap-4">
                <label for="prd-display" class="block flex-grow font-semibold text-lg md:text-xl text-green-500">PRD</label>
                <button
                    on:click={() => copyToClipboard(appState.prd)}
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
                    on:click={handleUserStoryGeneration}
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
                class="prose prose-invert max-w-none w-full max-h-50 flex-grow p-6 bg-gray-950 border border-green-500 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            >
                {@html marked(appState.prd)}
            </div>
        </div>
    {/if}

    <!-- User Stories Box -->
    {#if appState.userStories.length > 0}
        <div class="flex flex-col space-y-4 px-2 col-span-2">
            <div class="flex items-center gap-4">
                <label for="user-stories" class="block flex-grow text-lg md:text-xl font-semibold text-yellow-500">User Stories {`(${appState.userStories.length})`}</label>
                <!-- a button to push to the PM tool -->
                <button
                    on:click={handleProjectCreation}
                    class="flex mt-1 items-center gap-2 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                    </svg>
                    {`Create new project on ${appState.settings.tool}`}
                </button>
            </div>
            <div id="user-stories" class="w-full overflow-auto rounded-lg p-2">
                {#each appState.userStories as userStory}
                    <details class="space-y-2 p-2 rounded-lg border-t border-gray-600">
                        <summary class="cursor-pointer text-white p-2 rounded-lg hover:bg-gray-700 transition-all duration-200">{userStory.title}</summary>
                        <div class="px-2">
                            <p class="mb-4 text-sm">{@html marked(userStory.description)}</p>
                        </div>
                    </details>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style lang="postcss">
    :global(.prose) {
        line-height: 1.5;
    }

    :global(.prose h1) {
        margin-bottom: 1rem;
        font-size: 1.875rem;
        font-weight: 700;
        letter-spacing: -0.025em;
    }

    :global(.prose h2) {
        margin-top: 1.25rem;
        margin-bottom: 0.75rem;
        font-size: 1.5rem;
        font-weight: 600;
    }

    :global(.prose h3) {
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        font-size: 1.25rem;
    }

    :global(.prose p) {
        margin-top: 0.75rem;
        margin-bottom: 0.75rem;
    }

    :global(.prose ul, .prose ol) {
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
        padding-left: 1.25rem;
    }

    :global(.prose li) {
        margin-top: 0.25rem;
        margin-bottom: 0.25rem;
    }
</style>
