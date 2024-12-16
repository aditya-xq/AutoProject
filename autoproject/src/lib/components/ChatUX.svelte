<script lang="ts">
    import { appState, resetState } from '$lib/state.svelte';
    import { notificationStore } from '$lib/store';
    import { starterPrompts } from '$lib/utils/config';
    import { PRD_PROMPTS } from '$lib/services/prompts';
    import { useChat } from '@ai-sdk/svelte';

    export let generatePrdDisabled = false;

    const { input, handleSubmit, messages, setMessages, stop, error } = useChat({
        api: '/api/chat',
        body: {
            settings: appState.settings,
        }
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

    $: if ($error) {
        notificationStore.addNotification('Error occurred during inference. Please check if your inference server is running properly', 'error');
        appState.isLoading = false;
    }

    function handleSubmitHandler() {
        appState.isLoading = true;
        appState.promptType = 'prd';
        promptSuffix = PRD_PROMPTS[appState.settings.prdType];
        prompt = `Requirement: ${appState.requirements}. ${promptSuffix}`;
        setMessages([]);
        input.set(prompt);
        handleSubmit();
    }

    function clearContent() {
        resetState();
        setMessages([]);
        input.set('');
        stop();
        notificationStore.addNotification('All content cleared', 'success');
    }

    function handleStarterClick(requirements: string) {
        appState.requirements = requirements;
        handleSubmitHandler();
    }
</script>

<div class="flex flex-col space-y-4">
    <div class="flex gap-3">
        <input
            id="requirements" 
            autocomplete="off"
            class="grow text-white p-4 bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-lg transition-all duration-200"
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
            class="px-6 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
        >
            Generate PRD
        </button>

        <button
            on:click={clearContent}
            class="px-6 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg transition-all duration-200"
            aria-label="Clear Content"
        >
            Clear All
        </button>
    </div>

    <!-- Starter Prompts with updated styling -->
    {#if !appState.prd}
        <div class="space-y-4">
            <p class="text-sm text-gray-400 font-medium">Explore ideas:</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {#each starterPrompts as { label, requirements }}
                    <button
                        on:click={() => handleStarterClick(requirements)}
                        class="p-4 rounded-xl border border-purple-500/20 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-700/50 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-purple-500/20 text-gray-300 hover:text-white">
                        {label}
                    </button>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
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
