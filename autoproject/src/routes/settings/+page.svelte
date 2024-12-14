<script lang="ts">
    import { appState } from '$lib/state.svelte';
    import { tools, prdTypeOptions, userStoryTypeOptions, aiInferenceOptions, modelMap, aiModelOptions } from '$lib/utils/config';
</script>

<div class="bg-gray-950 text-gray-100 min-h-screen flex flex-col px-6 md:px-16 lg:px-60 py-6 space-y-8">
    <h1 class="text-2xl font-semibold mb-4">⚙️ Settings</h1>
    <div class="space-y-8 w-full md:w-4/5">
        <!-- Project Management Tool -->
        <div>
            <h2 class="text-xl font-medium mb-4">Project Management Tool</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {#each tools as type}
                <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {(appState.settings.tool === type ? 'bg-gray-950 border-gray-500' : 'bg-gray-800 border-gray-600')} transition-colors duration-200"
                     onclick={() => appState.settings.tool = type}>
                    <div class="flex items-center justify-center space-x-2">
                        {#if appState.settings.tool === type}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        {/if}
                        <span>{type}</span>
                    </div>
                </button>
                {/each}
            </div>
        </div>

        <!-- PRD Type -->
        <div>
            <h2 class="text-xl font-medium mb-4">PRD Type</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {#each prdTypeOptions as type}
                <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {(appState.settings.prdType === type ? 'bg-gray-950 border-gray-500' : 'bg-gray-800 border-gray-600')} transition-colors duration-200"
                     onclick={() => appState.settings.prdType = type}>
                    <div class="flex items-center justify-center space-x-2">
                        {#if appState.settings.prdType === type}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        {/if}
                        <span>{type}</span>
                    </div>
                </button>
                {/each}
            </div>
        </div>

        <!-- User Story Type -->
        <div>
            <h2 class="text-xl font-medium mb-4">User Story Type</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {#each userStoryTypeOptions as type}
                <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {(appState.settings.userStoryType === type ? 'bg-gray-950 border-gray-500' : 'bg-gray-800 border-gray-600')} transition-colors duration-200"
                     onclick={() => appState.settings.userStoryType = type}>
                    <div class="flex items-center justify-center space-x-2">
                        {#if appState.settings.userStoryType === type}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        {/if}
                        <span>{type}</span>
                    </div>
                </button>
                {/each}
            </div>
        </div>

        <!-- AI Inference Type -->
        <div>
            <h2 class="text-xl font-medium mb-4">Inference Model</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {#each aiInferenceOptions as type}
                <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {(appState.settings.aiInferenceType === type ? 'bg-gray-950 border-gray-500' : 'bg-gray-800 border-gray-600')} transition-colors duration-200"
                    onclick={() => { appState.settings.aiInferenceType = type; appState.settings.aiModel = modelMap[aiModelOptions[type][0]] }}>
                    <div class="flex items-center justify-center space-x-2">
                        {#if appState.settings.aiInferenceType === type}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        {/if}
                        <span>{type}</span>
                    </div>
                </button>
                {/each}
            </div>
        </div>

        <!-- AI Model Selection -->
        <div>
            <h2 class="text-xl font-medium mb-4">{`AI Model (${appState.settings.aiInferenceType})`}</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {#each aiModelOptions[`${appState.settings.aiInferenceType}`] as type}
                <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {(appState.settings.aiModel === modelMap[type] ? 'bg-gray-950 border-gray-500' : 'bg-gray-800 border-gray-600')} transition-colors duration-200"
                    onclick={() => appState.settings.aiModel = modelMap[type]}>
                    <div class="flex items-center justify-center space-x-2">
                        {#if appState.settings.aiModel === modelMap[type]}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                        {/if}
                        <span>{type}</span>
                    </div>
                </button>
                {/each}
            </div>
        </div>
    </div>
</div>
