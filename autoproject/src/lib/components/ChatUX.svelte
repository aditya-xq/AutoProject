<script lang="ts">
    import { appState, resetState } from '$lib/state.svelte'
    import { notificationStore } from '$lib/store'
    import { starterPrompts } from '$lib/utils/config'
    import { PRD_PROMPTS } from '$lib/services/prompts'
    import { Chat } from '@ai-sdk/svelte'

    let { generatePrdDisabled = false } = $props()

    const chat = new Chat({})

    let promptSuffix = $state('')
    let prompt = $state('')

    function handleSubmit(event: Event) {
        event.preventDefault()
        appState.isLoading = true
        appState.promptType = 'prd'
        promptSuffix = PRD_PROMPTS[appState.settings.prdType]
        if (appState.activeProject.name) {
            prompt = `Existing project Name: ${appState.activeProject.name}. description: ${appState.activeProject.description}. New feature requirement to be added to this project: ${appState.requirements}. ${promptSuffix}`
        } else {
            prompt = `Requirement: ${appState.requirements}. ${promptSuffix}`
        }
        chat.sendMessage(
            { text: prompt},
            { body: {
                "settings": appState.settings,
                "prompt": prompt,
        }})
    }

    // Handle messages updates
    $effect(() => {
        if (chat.messages.length > 1) {
            appState.isLoading = false;
            const lastMessage = chat.messages[chat.messages.length - 1]
            if (lastMessage.role === 'assistant' && appState.promptType === 'prd') {
                const textPart = lastMessage.parts.find((part: any) => part.type === 'text') as any
                appState.prd = textPart?.text ?? ''
            }
        }
    })

    // Handle error
    $effect(() => {
        if (chat.error) {
            const errorMessage = 'Error occurred during inference. Please check if you hit rate limits or if API keys are correct or if inference server is running properly'
            notificationStore.addNotification(errorMessage, 'error')
            appState.isLoading = false
        }
    })

    function clearContent() {
        resetState()
        stop()
        notificationStore.addNotification('All content cleared', 'success')
    }

    function handleStarterClick(requirements: string, event: Event) {
        appState.requirements = requirements
        handleSubmit(event)
    }
</script>

<div class="flex flex-col space-y-4">
    <div class="flex gap-2 items-center">
        <input
            id="requirements"
            autocomplete="off"
            bind:value={appState.requirements}
            placeholder="What do you want to build?"
            aria-label="Enter project requirements"
            onkeydown={(e) => e.key === 'Enter' && handleSubmit(e)}
            class="grow p-4 text-lg text-neutral-100
                bg-neutral-900
                border border-neutral-800
                rounded-md
                placeholder:text-neutral-500
                focus:outline-none focus:border-neutral-600
                transition"
        />
    </div>
    <div class="text-right">
        <button
            id="generate-prd"
            aria-label="Generate PRD"
            disabled={generatePrdDisabled}
            onclick={handleSubmit}
            class="px-3 py-2 text-sm font-medium
                bg-purple-600 text-white
                rounded-md
                hover:bg-purple-500
                transition
                disabled:opacity-40
                disabled:cursor-not-allowed"
        >
            Generate
        </button>
        <button
            onclick={clearContent}
            aria-label="Clear Content"
            class="px-3 py-2 text-sm font-medium
                text-neutral-300
                bg-neutral-800
                border border-neutral-700
                rounded-md
                hover:bg-neutral-700
                transition"
        >
            Reset
        </button>
    </div>
    {#if !appState.prd && !appState.activeProject.name}
        <div class="space-y-4">
            <p class="text-sm text-neutral-400 font-semibold">Explore Ideas</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {#each starterPrompts as { label, requirements }}
                    <button
                        onclick={(e) => handleStarterClick(requirements, e)}
                        class="px-4 py-2
                                rounded-md
                                border border-neutral-700/50 
                                bg-neutral-900 
                                hover:bg-neutral-800 
                                cursor-pointer 
                                transition-colors duration-200 
                                text-neutral-200 
                                text-left text-sm
                                font-medium"
                    >
                        {label}
                    </button>
                {/each}
            </div>
        </div>
    {/if}
    {#if !appState.prd && appState.activeProject.name && appState.activeProject?.suggestions?.length > 0}
        <div class="space-y-4">
             <p class="text-sm text-neutral-400 font-semibold">Suggested Features</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {#each appState.activeProject.suggestions as suggestion}
                    <button
                        onclick={(e) => handleStarterClick(suggestion, e)}
                        class="px-4 py-2
                                rounded-md
                                border border-neutral-700/50 
                                bg-neutral-900 
                                hover:bg-neutral-800 
                                cursor-pointer 
                                transition-colors duration-200 
                                text-neutral-200 
                                text-left text-sm
                                font-medium"
                    >
                        {suggestion}
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
