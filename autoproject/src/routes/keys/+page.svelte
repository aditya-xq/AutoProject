<script lang="ts">
    import { fade } from 'svelte/transition';

    const API_PLATFORMS = [
        { id: 'linear', name: 'Linear', description: 'Required for project management integration' },
        { id: 'gemini', name: 'Gemini', description: 'Required for AI-powered PRD and user story generation' },
        { id: 'groq', name: 'Groq', description: 'Optional - Alternative AI provider for faster inference' }
    ];

    let passphrase = ''; // User-defined encryption passphrase
    let keys: any[] = [];       // Store state for API keys
    let error = '';      // Error message state
    let success = '';    // Success message state

    /**
     * Save an API key to the store and local storage.
     * @param {string} platform - The API platform ID.
     * @param {string} value - The API key value.
     */
    function saveApiKey(platform: string, value: string) {
        if (!value || !passphrase) {
            error = 'Both API key and passphrase are required';
            return;
        }

        try {
            success = `${platform} API key saved successfully`;
            setTimeout(() => success = '', 3000); // Clear success message after 3 seconds
            error = ''; // Clear error message
        } catch (e) {
            console.error(e);
            error = 'Failed to save key. Please check your input and passphrase.';
        }
    }
</script>

<div class="text-gray-100 min-h-screen flex flex-col px-6 max-w-3xl py-12 md:px-16 lg:px-32 space-y-6">
    <h1 class="text-2xl font-semibold">🔑 Manage Your API Keys (Placeholder)</h1>
    <p class="text-gray-400">Warning: API keys are sensitive information.</p>

    <!-- Error Message -->
    {#if error}
        <div class="bg-red-500/20 border border-red-500 text-red-200 px-3 py-2 rounded text-sm" transition:fade>
            {error}
        </div>
    {/if}

    <!-- Success Message -->
    {#if success}
        <div class="bg-green-500/20 border border-green-500 text-green-200 px-3 py-2 rounded text-sm" transition:fade>
            {success}
        </div>
    {/if}

    <div class="space-y-6">
        <!-- Encryption Passphrase Section -->
        <div>
            <h2 class="text-lg font-medium mb-2">Encryption Passphrase</h2>
            <input
                type="password"
                bind:value={passphrase}
                class="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm"
                placeholder="Enter your encryption passphrase"
            />
        </div>

        <!-- API Key Management Section -->
        {#each API_PLATFORMS as platform}
            <div>
                <h2 class="text-lg font-medium mb-2">{platform.name}</h2>
                <p class="text-xs text-gray-400">{platform.description}</p>
                <div class="flex gap-2 mt-2">
                    <input
                        type="password"
                        id={platform.id}
                        class="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm"
                        placeholder={`Enter ${platform.name} API Key`}
                    />
                    <button
                        on:click={() => saveApiKey(platform.id, document.getElementById(platform.id)?.value || '')}
                        class="px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 hover:border-gray-500 transition-colors duration-200 text-sm whitespace-nowrap"
                    >
                        {keys.find(k => k.label === platform.id) ? 'Update Key' : 'Save Key'}
                    </button>
                </div>
            </div>
        {/each}
    </div>
</div>