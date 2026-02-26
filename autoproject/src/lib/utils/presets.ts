import type { AIInferenceType, PRDType, UserStoryType } from './types'

export type PresetId = 'rapid' | 'enterprise' | 'user-centric' | 'local-focus' | 'research'

export type PresetSettings = {
    aiInferenceType: AIInferenceType
    aiModelLabel: string
    prdType: PRDType
    userStoryType: UserStoryType
}

export type PresetConfig = {
    id: PresetId
    title: string
    icon: string
    description: string
    settings: PresetSettings
}

export const presetConfigs: PresetConfig[] = [
    {
        id: 'rapid',
        title: 'Rapid POC',
        icon: '\u{1F680}',
        description: 'Zero to MVP in record time. Perfect for quick validation.',
        settings: {
            aiInferenceType: 'Groq',
            aiModelLabel: 'Kimi K2',
            prdType: 'Minimal',
            userStoryType: 'Minimal'
        }
    },
    {
        id: 'enterprise',
        title: 'Enterprise',
        icon: '\u{1F3E2}',
        description: 'Built for complex projects requiring technical depth.',
        settings: {
            aiInferenceType: 'Gemini',
            aiModelLabel: 'Gemini 3 Flash',
            prdType: 'Feature Based',
            userStoryType: 'Technical'
        }
    },
    {
        id: 'user-centric',
        title: 'User-Centric',
        icon: '\u{1F465}',
        description: 'Optimized for user experience flows.',
        settings: {
            aiInferenceType: 'Groq',
            aiModelLabel: 'Kimi K2',
            prdType: 'Narrative',
            userStoryType: 'User-Focused'
        }
    },
    {
        id: 'local-focus',
        title: 'Local Focus',
        icon: '\u{1F3AF}',
        description: 'Local-first focused planning with technical depth.',
        settings: {
            aiInferenceType: 'LM Studio',
            aiModelLabel: 'GLM 4.7 Flash',
            prdType: 'Focused',
            userStoryType: 'Technical'
        }
    },
    {
        id: 'research',
        title: 'Research',
        icon: '\u{1F52C}',
        description: 'Ideal for research projects and experiments.',
        settings: {
            aiInferenceType: 'Gemini',
            aiModelLabel: 'Gemini 3 Pro',
            prdType: 'Research',
            userStoryType: 'Research'
        }
    }
]

export function getPresetItems(preset: PresetConfig): Array<[string, string]> {
    return [
        ['Platform', preset.settings.aiInferenceType],
        ['Model', preset.settings.aiModelLabel],
        ['PRD Type', preset.settings.prdType],
        ['User Story', preset.settings.userStoryType]
    ]
}
