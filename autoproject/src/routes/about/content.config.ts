import { getPresetItems, presetConfigs } from '$lib/utils/presets'
import { aiModelOptions } from '$lib/utils/config'

export const quickPresets = presetConfigs.map((preset) => ({
    id: preset.id,
    icon: preset.icon,
    title: preset.title,
    description: preset.description,
    items: getPresetItems(preset)
}))

export const modelGuide = [
    {
        icon: '\u{1F916}',
        title: 'AI Platforms',
        sections: [
            {
                title: 'Groq',
                detail: aiModelOptions.Groq.join(', '),
                hint: 'Best for: Enterprise-grade inference'
            },
            {
                title: 'LM Studio',
                detail: aiModelOptions['LM Studio'].join(', '),
                hint: 'Best for: Local development'
            },
            {
                title: 'Gemini',
                detail: aiModelOptions.Gemini.join(', '),
                hint: 'Best for: Complex reasoning'
            }
        ]
    },
    {
        icon: '\u{1F4DD}',
        title: 'PRD Types',
        sections: [
            ['Feature Based', 'Detailed enterprise projects'],
            ['Focused', 'Mid-sized projects'],
            ['Minimal', 'Quick MVPs'],
            ['Narrative', 'User-centric experiences'],
            ['Research', 'Research and experiments']
        ],
        accent: 'text-green-400'
    },
    {
        icon: '\u{1F4DA}',
        title: 'Story Types',
        sections: [
            ['Technical', 'System architecture'],
            ['User-Focused', 'UX-driven features'],
            ['Minimal', 'Core functionality'],
            ['Research', 'Research-oriented tasks']
        ],
        accent: 'text-blue-400'
    }
]
