<script lang="ts">
    import { Presets } from '$lib/components';
    import { appState } from '$lib/state.svelte';
    import { tools, prdTypeOptions, aiInferenceOptions, modelMap, aiModelOptions, userStoryTypeOptions } from '$lib/utils/config';
</script>

<div class="container mx-auto max-w-6xl text-gray-100 px-4 py-6">
    <h1 class="text-2xl font-bold">⚙️ Settings</h1>
    <div class="p-6"><Presets/></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Left Column -->
        <div class="space-y-4 px-4">
            <!-- Project Management Tool -->
            <h2 class="text-lg font-semibold text-purple-400 mb-3">Project Tool</h2>
            <div class="flex flex-wrap gap-2">
                {#each tools as type}
                    <button 
                        class="px-3 py-2 rounded-lg text-sm transition-colors {appState.settings.tool === type ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}"
                        onclick={() => appState.settings.tool = type}>
                        {type}
                    </button>
                {/each}
            </div>

            <!-- PRD Type -->
            <h2 class="text-lg font-semibold text-purple-400 mb-3">PRD Type</h2>
            <div class="flex flex-wrap gap-2">
                {#each prdTypeOptions as type}
                    <button 
                        class="px-3 py-2 rounded-lg text-sm transition-colors {appState.settings.prdType === type ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}"
                        onclick={() => appState.settings.prdType = type}>
                        {type}
                    </button>
                {/each}
            </div>

            <!-- User Story Type -->
            <h2 class="text-lg font-semibold text-purple-400 mb-3">User Story Type</h2>
            <div class="flex flex-wrap gap-2">
                {#each userStoryTypeOptions as type}
                    <button 
                        class="px-3 py-2 rounded-lg text-sm transition-colors {appState.settings.userStoryType === type ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}"
                        onclick={() => appState.settings.userStoryType = type}>
                        {type}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Right Column -->
        <div class="space-y-4">
            <!-- AI Inference -->
            <h2 class="text-lg font-semibold text-purple-400 mb-3">Inference Platform</h2>
            <div class="flex flex-wrap gap-2">
                {#each aiInferenceOptions as type}
                    <button 
                        class="px-3 py-2 rounded-lg text-sm transition-colors {appState.settings.aiInferenceType === type ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}"
                        onclick={() => {
                            appState.settings.aiInferenceType = type;
                            appState.settings.aiModel = modelMap[aiModelOptions[type][0]];
                        }}>
                        {type}
                    </button>
                {/each}
            </div>
            <!-- AI Model -->
            <h2 class="text-lg font-semibold text-purple-400 mb-3">Model</h2>
            <div class="flex flex-wrap gap-2">
                {#each aiModelOptions[appState.settings.aiInferenceType] as type}
                    <button 
                        class="px-3 py-2 rounded-lg text-sm transition-colors {appState.settings.aiModel === modelMap[type] ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}"
                        onclick={() => appState.settings.aiModel = modelMap[type]}>
                        {type}
                    </button>
                {/each}
            </div>
        </div>
    </div>
</div>
