<script lang="ts">
    import { appState } from '$lib/state.svelte';
    import { tools, prdTypeOptions, aiInferenceOptions, modelMap, aiModelOptions, userStoryTypeOptions } from '$lib/utils/config';

    function getActivePreset() {
        if (appState.settings.aiInferenceType === 'Groq' &&
            appState.settings.aiModel === modelMap['Llama 3.3 70b'] &&
            appState.settings.prdType === 'Minimal' &&
            appState.settings.userStoryType === 'Minimal') {
            return 'rapid';
        } else if (appState.settings.aiInferenceType === 'Gemini' &&
            appState.settings.aiModel === modelMap['Gemini 2 Flash'] &&
            appState.settings.prdType === 'Feature Based' &&
            appState.settings.userStoryType === 'Technical') {
            return 'enterprise';
        } else if (appState.settings.aiInferenceType === 'LM Studio' &&
            appState.settings.aiModel === modelMap['Llama 3.1 8b'] &&
            appState.settings.prdType === 'Narrative' &&
            appState.settings.userStoryType === 'User-Focused') {
            return 'user-centric';
        }
        return '';
    }

    let activePreset = $derived(getActivePreset());
</script>

<div class="text-gray-100 min-h-screen flex flex-col px-6 md:px-16 lg:px-32 py-12 space-y-8 pb-40">
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
        <div>
            <h2 class="text-xl font-medium mb-4">Presets</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Rapid POC Preset -->
                <button 
                    class="group relative bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700 hover:border-indigo-500 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 text-left
                        {activePreset === 'rapid' ? 'bg-gradient-to-br from-gray-900 to-gray-950 border-indigo-500 shadow-lg shadow-indigo-500/20' : ''}"
                    onclick={() => {
                        appState.settings.aiInferenceType = 'Groq';
                        appState.settings.aiModel = modelMap['Llama 3.3 70b'];
                        appState.settings.prdType = 'Minimal';
                        appState.settings.userStoryType = 'Minimal';
                    }}
                >
                    <!-- Add active indicator -->
                    {#if activePreset === 'rapid'}
                        <div class="absolute -top-2 -right-2 bg-indigo-500 text-white p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    {/if}
                    <div class="flex items-center gap-3 mb-4">
                        <span class="text-2xl">🚀</span>
                        <h3 class="text-lg font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Rapid POC</h3>
                    </div>
                    <ul class="space-y-3">
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">Platform</span>
                            <span class="text-purple-400">Groq</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">Model</span>
                            <span class="text-purple-400">Llama 3.3 70b</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">PRD Type</span>
                            <span class="text-purple-400">Minimal</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">User Story</span>
                            <span class="text-purple-400">Minimal</span>
                        </li>
                    </ul>
                    <div class="h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>
                    <p class="text-sm text-gray-400 leading-relaxed">
                        Zero to MVP in record time. Perfect for quick validation and rapid iterations.
                    </p>
                </button>

                <!-- Enterprise Preset -->
                <button 
                    class="group relative bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 text-left 
                        {activePreset === 'enterprise' ? 'bg-gradient-to-br from-gray-900 to-gray-950 !border-blue-500 shadow-lg shadow-blue-500/20' : ''}"
                    onclick={() => {
                        appState.settings.aiInferenceType = 'Gemini';
                        appState.settings.aiModel = modelMap['Gemini 2 Flash'];
                        appState.settings.prdType = 'Feature Based';
                        appState.settings.userStoryType = 'Technical';
                    }}
                >
                    {#if activePreset === 'enterprise'}
                        <div class="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    {/if}
                    <div class="flex items-center gap-3 mb-4">
                        <span class="text-2xl">🏢</span>
                        <h3 class="text-lg font-medium bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Enterprise</h3>
                    </div>
                    <ul class="space-y-3">
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">Platform</span>
                            <span class="text-blue-400">Gemini</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">Model</span>
                            <span class="text-blue-400">Gemini 2 Flash</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">PRD Type</span>
                            <span class="text-blue-400">Feature Based</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">User Story</span>
                            <span class="text-blue-400">Technical</span>
                        </li>
                    </ul>
                    <div class="h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>
                    <p class="text-sm text-gray-400 leading-relaxed">
                        Built for complex projects requiring detailed documentation and technical depth.
                    </p>
                </button>

                <!-- User-Centric Preset -->
                <button 
                    class="group relative bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 text-left 
                        {activePreset === 'user-centric' ? 'bg-gradient-to-br from-gray-900 to-gray-950  border-green-500 shadow-lg shadow-green-500/20' : ''}"
                    onclick={() => {
                        appState.settings.aiInferenceType = 'LM Studio';
                        appState.settings.aiModel = modelMap['Llama 3.1 8b'];
                        appState.settings.prdType = 'Narrative';
                        appState.settings.userStoryType = 'User-Focused';
                    }}
                >
                    {#if activePreset === 'user-centric'}
                        <div class="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    {/if}
                    <div class="flex items-center gap-3 mb-4">
                        <span class="text-2xl">👥</span>
                        <h3 class="text-lg font-medium bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">User-Centric</h3>
                    </div>
                    <ul class="space-y-3">
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">Platform</span>
                            <span class="text-green-400">LM Studio</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">Model</span>
                            <span class="text-green-400">Llama 3.1 8b</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">PRD Type</span>
                            <span class="text-green-400">Narrative</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-400 text-sm">User Story</span>
                            <span class="text-green-400">User-Focused</span>
                        </li>
                    </ul>
                    <div class="h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>
                    <p class="text-sm text-gray-400 leading-relaxed">
                        Optimized for applications focused on user experience and interaction flows.
                    </p>
                </button>
            </div>
        </div>

        <!-- PRD Type -->
        <div>
            <h2 class="text-xl font-medium mb-4">PRD Type</h2>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
            <h2 class="text-xl font-medium mb-4">Inference Platform</h2>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
            <h2 class="text-xl font-medium mb-4">{`Model`}</h2>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
