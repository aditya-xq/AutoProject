<script lang="ts">
    import type { AIInferenceType, PRDType, ProjectManagementTool, UserStoryType } from '$lib';
    import { settings } from '$lib/store';
    const prdTypeOptions: PRDType[] = ['Feature Based', 'Narrative'];
    const userStoryTypeOptions: UserStoryType[] = ['Role-Feature-Reason', 'Situation-Action-Outcome', 'Given-When-Then'];
    const aiInferenceOptions: AIInferenceType[] = ['Gemini Pro', 'Groq', 'LM Studio'];
    const tools: ProjectManagementTool[] = ['Linear', 'Asana', 'Jira', 'Plane'];
    const aiModelOptions: any = {
        'Groq' : ['Llama3-70b', 'Mixtral-8x7b'],
        'LM Studio' : ['Phi3-4k', 'Llama3-8b'],
    }
    const modelMap: any = {
        'Llama3-70b' : 'llama3-70b-8192',
        'Mixtral-8x7b' : 'mixtral-8x7b-32768',
        'Phi3-4k' : 'Phi-3-mini-4k-instruct-GGUF',
        'Llama3-8b' : 'Meta-Llama-3-8B-Instruct-GGUF',
    }
</script>

<div class="bg-gray-950 text-gray-100 min-h-screen flex flex-col px-6 md:px-16 lg:px-60 py-6 space-y-8">
    <h1 class="text-2xl font-semibold mb-4">⚙️ Settings</h1>
    <div class="space-y-8 w-full md:w-4/5">
        <!-- Project Management Tool -->
        <div>
            <h2 class="text-xl font-medium mb-4">Project Management Tool</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {#each tools as type}
                <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {($settings.tool === type ? 'bg-gray-800 border-gray-500' : 'bg-gray-700 border-gray-600')} transition-colors duration-200"
                     onclick={() => $settings.tool = type}>
                    <div class="flex items-center justify-center space-x-2">
                        {#if $settings.tool === type}
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
                <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {($settings.prdType === type ? 'bg-gray-800 border-gray-500' : 'bg-gray-700 border-gray-600')} transition-colors duration-200"
                     onclick={() => $settings.prdType = type}>
                    <div class="flex items-center justify-center space-x-2">
                        {#if $settings.prdType === type}
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
                <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {($settings.userStoryType === type ? 'bg-gray-800 border-gray-500' : 'bg-gray-700 border-gray-600')} transition-colors duration-200"
                     onclick={() => $settings.userStoryType = type}>
                    <div class="flex items-center justify-center space-x-2">
                        {#if $settings.userStoryType === type}
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
            <h2 class="text-xl font-medium mb-4">AI Inference Type</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {#each aiInferenceOptions as type}
                <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {($settings.aiInferenceType === type ? 'bg-gray-800 border-gray-500' : 'bg-gray-700 border-gray-600')} transition-colors duration-200"
                    onclick={() => { $settings.aiInferenceType = type; $settings.aiModel = modelMap[aiModelOptions[type][0]] }}>
                    <div class="flex items-center justify-center space-x-2">
                        {#if $settings.aiInferenceType === type}
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
        {#if $settings.aiInferenceType === 'Groq' || $settings.aiInferenceType === 'LM Studio'}
            <div>
                <h2 class="text-xl font-medium mb-4">{`AI Model (${$settings.aiInferenceType})`}</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {#each aiModelOptions[`${$settings.aiInferenceType}`] as type}
                    <button class="p-3 rounded-lg border cursor-pointer hover:border-gray-500 {($settings.aiModel === modelMap[type] ? 'bg-gray-800 border-gray-500' : 'bg-gray-700 border-gray-600')} transition-colors duration-200"
                        onclick={() => $settings.aiModel = modelMap[type]}>
                        <div class="flex items-center justify-center space-x-2">
                            {#if $settings.aiModel === modelMap[type]}
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
        {/if}
    </div>
</div>
