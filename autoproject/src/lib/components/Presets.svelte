<script lang="ts">
    import { appState } from "$lib/state.svelte"
    import { modelMap } from "$lib/utils/config"

    // central presets config — add/modify presets here
    const presets = [
        {
            id: 'rapid',
            title: 'Rapid POC',
            emoji: '🚀',
            headerClass: 'bg-linear-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent',
            accentClass: 'text-orange-400',
            cardBaseClass: 'group relative bg-linear-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-orange-500 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 text-left',
            cardActiveExtra: 'bg-linear-to-br from-gray-900 to-gray-950 border-orange-500 shadow-lg shadow-orange-500/20',
            checkBg: 'bg-orange-500',
            list: [
                { label: 'Platform', value: 'Groq' },
                { label: 'Model', value: 'Kimi K2' },
                { label: 'PRD Type', value: 'Minimal' },
                { label: 'User Story', value: 'Minimal' }
            ],
            description: 'Zero to MVP in record time.',
            // actual settings to write into appState (use modelMap where needed)
            settings: {
                aiInferenceType: 'Groq',
                aiModel: modelMap['Kimi K2'],
                prdType: 'Minimal',
                userStoryType: 'Minimal'
            }
        },
        {
            id: 'enterprise',
            title: 'Enterprise',
            emoji: '🏢',
            headerClass: 'bg-linear-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent',
            accentClass: 'text-purple-400',
            cardBaseClass: 'group relative bg-linear-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 text-left',
            cardActiveExtra: 'bg-linear-to-br from-gray-900 to-gray-950 border-purple-500! shadow-lg shadow-purple-500/20',
            checkBg: 'bg-purple-500',
            list: [
                { label: 'Platform', value: 'Gemini' },
                { label: 'Model', value: 'Gemini 2.5 Flash' },
                { label: 'PRD Type', value: 'Feature Based' },
                { label: 'User Story', value: 'Technical' }
            ],
            description: 'Complex projects with technical depth.',
            settings: {
                aiInferenceType: 'Gemini',
                aiModel: modelMap['Gemini 2.5 Flash'],
                prdType: 'Feature Based',
                userStoryType: 'Technical'
            }
        },
        {
            id: 'user-centric',
            title: 'User Centric',
            emoji: '👥',
            headerClass: 'bg-linear-to-r from-green-400 to-teal-400 bg-clip-text text-transparent',
            accentClass: 'text-green-400',
            cardBaseClass: 'group relative bg-linear-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-green-500 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 text-left',
            cardActiveExtra: 'bg-linear-to-br from-gray-900 to-gray-950  border-green-500 shadow-lg shadow-green-500/20',
            checkBg: 'bg-green-500',
            list: [
                { label: 'Platform', value: 'LM Studio' },
                { label: 'Model', value: 'Llama 3.1 8b' },
                { label: 'PRD Type', value: 'Narrative' },
                { label: 'User Story', value: 'User-Focused' }
            ],
            description: 'Optimized for UX flows.',
            settings: {
                aiInferenceType: 'LM Studio',
                aiModel: modelMap['Llama 3.1 8b'],
                prdType: 'Narrative',
                userStoryType: 'User-Focused'
            }
        },
        {
            id: 'research',
            title: 'Research',
            emoji: '🔬',
            headerClass: 'bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent',
            accentClass: 'text-blue-400',
            cardBaseClass: 'group relative bg-linear-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 text-left',
            cardActiveExtra: 'bg-linear-to-br from-gray-900 to-gray-950 border-blue-500! shadow-lg shadow-blue-500/20',
            checkBg: 'bg-blue-500',
            list: [
                { label: 'Platform', value: 'Gemini' },
                { label: 'Model', value: 'Gemini 3 Pro' },
                { label: 'PRD Type', value: 'Research' },
                { label: 'User Story', value: 'Research' }
            ],
            description: 'For research projects and experiments.',
            settings: {
                aiInferenceType: 'Gemini',
                aiModel: modelMap['Gemini 3 Pro'],
                prdType: 'Research',
                userStoryType: 'Research'
            }
        }
    ]

    // Evaluate which preset is active by comparing appState.settings
    function getActivePreset() {
        for (const p of presets) {
            const s = p.settings
            if (
                appState.settings.aiInferenceType === s.aiInferenceType &&
                appState.settings.aiModel === s.aiModel &&
                appState.settings.prdType === s.prdType &&
                appState.settings.userStoryType === s.userStoryType
            ) {
                return p.id
            }
        }
        return ''
    }

    // reactive activePreset (recomputes when appState.settings changes)
    let activePreset = $derived(getActivePreset())

    // apply preset to appState (single function instead of repeating)
    function applyPreset(preset: any) {
        const s = preset.settings
        appState.settings.aiInferenceType = s.aiInferenceType
        appState.settings.aiModel = s.aiModel
        appState.settings.prdType = s.prdType
        appState.settings.userStoryType = s.userStoryType
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-4 my-6 gap-8">
    {#each presets as preset}
        <button
            class="{preset.cardBaseClass} {activePreset === preset.id ? preset.cardActiveExtra : ''}"
            onclick={() => applyPreset(preset)}
        >
            {#if activePreset === preset.id}
                <div class="absolute -top-1 -right-1 {preset.checkBg} text-white p-1 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            {/if}

            <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">{preset.emoji}</span>
                <h3 class="text-base font-medium {preset.headerClass}">{preset.title}</h3>
            </div>

            <ul class="space-y-1 text-xs">
                {#each preset.list as item}
                    <li class="flex justify-between items-center">
                        <span class="text-gray-400">{item.label}</span>
                        <span class="{preset.accentClass}">{item.value}</span>
                    </li>
                {/each}
            </ul>

            <div class="h-px bg-linear-to-r from-transparent via-gray-700 to-transparent my-2"></div>
            <p class="text-xs text-gray-400">{preset.description}</p>
        </button>
    {/each}
</div>
