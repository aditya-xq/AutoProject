<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { getModelId } from '$lib/utils/config'
    import { getPresetItems, presetConfigs, type PresetId } from '$lib/utils/presets'

    type PresetStyle = {
        headerClass: string
        accentClass: string
        cardBaseClass: string
        cardActiveExtra: string
        checkBg: string
    }

    const presetStyles: Record<PresetId, PresetStyle> = {
        rapid: {
            headerClass: 'bg-linear-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent',
            accentClass: 'text-orange-400',
            cardBaseClass: 'group relative bg-linear-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-orange-500 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 text-left',
            cardActiveExtra: 'bg-linear-to-br from-gray-900 to-gray-950 border-orange-500 shadow-lg shadow-orange-500/20',
            checkBg: 'bg-orange-500'
        },
        enterprise: {
            headerClass: 'bg-linear-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent',
            accentClass: 'text-purple-400',
            cardBaseClass: 'group relative bg-linear-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 text-left',
            cardActiveExtra: 'bg-linear-to-br from-gray-900 to-gray-950 border-purple-500! shadow-lg shadow-purple-500/20',
            checkBg: 'bg-purple-500'
        },
        'user-centric': {
            headerClass: 'bg-linear-to-r from-green-400 to-teal-400 bg-clip-text text-transparent',
            accentClass: 'text-green-400',
            cardBaseClass: 'group relative bg-linear-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-green-500 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 text-left',
            cardActiveExtra: 'bg-linear-to-br from-gray-900 to-gray-950 border-green-500 shadow-lg shadow-green-500/20',
            checkBg: 'bg-green-500'
        },
        'local-focus': {
            headerClass: 'bg-linear-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent',
            accentClass: 'text-yellow-400',
            cardBaseClass: 'group relative bg-linear-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-yellow-500 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20 text-left',
            cardActiveExtra: 'bg-linear-to-br from-gray-900 to-gray-950 border-yellow-500 shadow-lg shadow-yellow-500/20',
            checkBg: 'bg-yellow-500'
        },
        research: {
            headerClass: 'bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent',
            accentClass: 'text-blue-400',
            cardBaseClass: 'group relative bg-linear-to-br from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 text-left',
            cardActiveExtra: 'bg-linear-to-br from-gray-900 to-gray-950 border-blue-500! shadow-lg shadow-blue-500/20',
            checkBg: 'bg-blue-500'
        }
    }

    const presets = presetConfigs.map((preset) => {
        const style = presetStyles[preset.id]
        const list = getPresetItems(preset).map(([label, value]) => ({ label, value }))

        return {
            ...preset,
            ...style,
            list,
            settings: {
                aiInferenceType: preset.settings.aiInferenceType,
                aiModel: getModelId(preset.settings.aiModelLabel),
                prdType: preset.settings.prdType,
                userStoryType: preset.settings.userStoryType
            }
        }
    })

    type RuntimePreset = (typeof presets)[number]

    function getActivePreset(): string {
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

    let activePreset = $derived(getActivePreset())

    function applyPreset(preset: RuntimePreset) {
        const s = preset.settings
        appState.settings.aiInferenceType = s.aiInferenceType
        appState.settings.aiModel = s.aiModel
        appState.settings.prdType = s.prdType
        appState.settings.userStoryType = s.userStoryType
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 my-6 gap-6">
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
                <span class="text-xl">{preset.icon}</span>
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
