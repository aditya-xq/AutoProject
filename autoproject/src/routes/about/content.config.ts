export const quickPresets = [
    {
        id: 'rapid',
        icon: '🚀',
        title: 'Rapid POC',
        description: 'Zero to MVP in record time. Perfect for quick validation.',
        items: [
        ['Platform', 'Groq'],
        ['Model', 'Kimi K2'],
        ['PRD Type', 'Minimal'],
        ['User Story', 'Minimal'],
        ],
    },
    {
        id: 'enterprise',
        icon: '🏢',
        title: 'Enterprise',
        description: 'Built for complex projects requiring technical depth.',
        items: [
        ['Platform', 'Gemini'],
        ['Model', 'Gemini 3 Flash'],
        ['PRD Type', 'Feature Based'],
        ['User Story', 'Technical'],
        ],
    },
    {
        id: 'user',
        icon: '👥',
        title: 'User-Centric',
        description: 'Optimized for user experience flows.',
        items: [
        ['Platform', 'LM Studio'],
        ['Model', 'Llama 3.1 8b'],
        ['PRD Type', 'Narrative'],
        ['User Story', 'User-Focused'],
        ],
    },
    {
        id: 'research',
        icon: '🔬',
        title: 'Research',
        description: 'Ideal for research projects and experiments.',
        items: [
        ['Platform', 'Gemini'],
        ['Model', 'Gemini 3 Pro'],
        ['PRD Type', 'Research'],
        ['User Story', 'Research'],
        ],
    },
]

export const modelGuide = [
    {
        icon: '🤖',
        title: 'AI Platforms',
        sections: [
        {
            title: 'Groq',
            detail: 'Llama 3.3 70b, Kimi K2, Llama 4 Maverick',
            hint: 'Best for: Enterprise-grade inference',
        },
        {
            title: 'LM Studio',
            detail: 'Llama 3.1 8b, Granite 4H Tiny, Gemma 3 12b, Phi 4',
            hint: 'Best for: Local development',
        },
        {
            title: 'Gemini',
            detail: 'Gemini 3 Flash, Gemini 3 Pro',
            hint: 'Best for: Complex reasoning',
        },
        ],
    },
    {
        icon: '📝',
        title: 'PRD Types',
        sections: [
        ['Feature Based', 'Detailed enterprise projects'],
        ['Focused', 'Mid-sized projects'],
        ['Minimal', 'Quick MVPs'],
        ['Narrative', 'User-centric experiences'],
        ['Research', 'Research and experiments'],
        ],
        accent: 'text-green-400',
    },
    {
        icon: '📚',
        title: 'Story Types',
        sections: [
        ['Technical', 'System architecture'],
        ['User-Focused', 'UX-driven features'],
        ['Minimal', 'Core functionality'],
        ['Research', 'Research-oriented tasks'],
        ],
        accent: 'text-blue-400',
    },
]
