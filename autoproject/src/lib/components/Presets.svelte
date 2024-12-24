<script>
    import { appState } from "$lib/state.svelte";
    import { modelMap } from "$lib/utils/config";

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
        } else if (appState.settings.aiInferenceType === 'Gemini' &&
            appState.settings.aiModel === modelMap['Gemini 2 Flash'] &&
            appState.settings.prdType === 'Research' &&
            appState.settings.userStoryType === 'Research') {
            return 'research';
        }
        return '';
    }

    let activePreset = $derived(getActivePreset());
</script>

<div class="grid grid-cols-1 md:grid-cols-4 my-6 gap-8">
    <!-- Rapid POC Preset -->
    <button 
        class="group relative bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-orange-500 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 text-left
            {activePreset === 'rapid' ? 'bg-gradient-to-br from-gray-900 to-gray-950 border-orange-500 shadow-lg shadow-orange-500/20' : ''}"
        onclick={() => {
            appState.settings.aiInferenceType = 'Groq';
            appState.settings.aiModel = modelMap['Llama 3.3 70b'];
            appState.settings.prdType = 'Minimal';
            appState.settings.userStoryType = 'Minimal';
        }}
    >
        {#if activePreset === 'rapid'}
            <div class="absolute -top-1 -right-1 bg-orange-500 text-white p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        {/if}
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">🚀</span>
            <h3 class="text-base font-medium bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Rapid POC</h3>
        </div>
        <ul class="space-y-1 text-xs">
            <li class="flex justify-between items-center">
                <span class="text-gray-400">Platform</span>
                <span class="text-orange-400">Groq</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">Model</span>
                <span class="text-orange-400">Llama 3.3 70b</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">PRD Type</span>
                <span class="text-orange-400">Minimal</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">User Story</span>
                <span class="text-orange-400">Minimal</span>
            </li>
        </ul>
        <div class="h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>
        <p class="text-xs text-gray-400">
            Zero to MVP in record time.
        </p>
    </button>

    <!-- Enterprise Preset -->
    <button 
        class="group relative bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 text-left 
            {activePreset === 'enterprise' ? 'bg-gradient-to-br from-gray-900 to-gray-950 !border-purple-500 shadow-lg shadow-purple-500/20' : ''}"
        onclick={() => {
            appState.settings.aiInferenceType = 'Gemini';
            appState.settings.aiModel = modelMap['Gemini 2 Flash'];
            appState.settings.prdType = 'Feature Based';
            appState.settings.userStoryType = 'Technical';
        }}
    >
        {#if activePreset === 'enterprise'}
            <div class="absolute -top-1 -right-1 bg-purple-500 text-white p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        {/if}
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">🏢</span>
            <h3 class="text-base font-medium bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Enterprise</h3>
        </div>
        <ul class="space-y-1 text-xs">
            <li class="flex justify-between items-center">
                <span class="text-gray-400">Platform</span>
                <span class="text-purple-400">Gemini</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">Model</span>
                <span class="text-purple-400">Gemini 2 Flash</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">PRD Type</span>
                <span class="text-purple-400">Feature Based</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">User Story</span>
                <span class="text-purple-400">Technical</span>
            </li>
        </ul>
        <div class="h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>
        <p class="text-xs text-gray-400">
            Built for complex projects with technical depth.
        </p>
    </button>

    <!-- User-Centric Preset -->
    <button 
        class="group relative bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-green-500 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 text-left 
            {activePreset === 'user-centric' ? 'bg-gradient-to-br from-gray-900 to-gray-950  border-green-500 shadow-lg shadow-green-500/20' : ''}"
        onclick={() => {
            appState.settings.aiInferenceType = 'LM Studio';
            appState.settings.aiModel = modelMap['Llama 3.1 8b'];
            appState.settings.prdType = 'Narrative';
            appState.settings.userStoryType = 'User-Focused';
        }}
    >
        {#if activePreset === 'user-centric'}
            <div class="absolute -top-1 -right-1 bg-green-500 text-white p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        {/if}
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">👥</span>
            <h3 class="text-base font-medium bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">User Centric</h3>
        </div>
        <ul class="space-y-1 text-xs">
            <li class="flex justify-between items-center">
                <span class="text-gray-400">Platform</span>
                <span class="text-green-400">LM Studio</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">Model</span>
                <span class="text-green-400">Llama 3.1 8b</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">PRD Type</span>
                <span class="text-green-400">Narrative</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">User Story</span>
                <span class="text-green-400">User-Focused</span>
            </li>
        </ul>
        <div class="h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>
        <p class="text-xs text-gray-400">
            Optimized for user experience flows.
        </p>
    </button>
    <!-- Research Preset -->
    <button 
        class="group relative bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 text-left 
            {activePreset === 'research' ? 'bg-gradient-to-br from-gray-900 to-gray-950 !border-blue-500 shadow-lg shadow-blue-500/20' : ''}"
        onclick={() => {
            appState.settings.aiInferenceType = 'Gemini';
            appState.settings.aiModel = modelMap['Gemini 2 Flash'];
            appState.settings.prdType = 'Research';
            appState.settings.userStoryType = 'Research';
        }}
    >
        {#if activePreset === 'research'}
            <div class="absolute -top-1 -right-1 bg-blue-500 text-white p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        {/if}
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">🔬</span>
            <h3 class="text-base font-medium bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Research</h3>
        </div>
        <ul class="space-y-1 text-xs">
            <li class="flex justify-between items-center">
                <span class="text-gray-400">Platform</span>
                <span class="text-blue-400">Gemini</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">Model</span>
                <span class="text-blue-400">Gemini 2 Flash</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">PRD Type</span>
                <span class="text-blue-400">Research</span>
            </li>
            <li class="flex justify-between items-center">
                <span class="text-gray-400">User Story</span>
                <span class="text-blue-400">Research</span>
            </li>
        </ul>
        <div class="h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>
        <p class="text-xs text-gray-400">
            Ideal for research projects and experiments.
        </p>
    </button>
</div>
