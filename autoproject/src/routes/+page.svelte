<script lang="ts">
    import { notificationStore, settings, appState } from "$lib/store";
    let loading = $state(false);

    // Generic function to handle API requests
    async function makeApiRequest(endpoint: any, payload: any) {
        loading = true;
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error || "Unknown error occurred");
            }
            return data;
        } catch (error: any) {
            notificationStore.addNotification(error, 'error');
            return null; // Return null to indicate failure
        } finally {
            loading = false;
        }
    }

    // Function to generate PRD based on requirements
    async function generatePRD() {
        const response = await makeApiRequest(`/api/generate`, {
            requirements: $appState.requirements, settings: $settings
        });
        if (response && response.data) {
            $appState.prd = response.data.prd;
            $appState.projectDetails = response.data.projectDetails;
            notificationStore.addNotification('PRD generated successfully', 'success');
        }
    }

    // Function to generate user stories based on PRD
    async function generateUserStories() {
        const response = await makeApiRequest(`/api/generate`, {
            prd: $appState.prd, settings: $settings
        });
        if (response && response.data) {
            $appState.userStories = response.data;
            notificationStore.addNotification('Userstories generated successfully', 'success');
        }
    }

    async function createStories() {
        const response = await makeApiRequest(`/api/create`, {
            tool: $settings.tool,
            projectDetails: $appState.projectDetails,
            userStories: $appState.userStories
        });
        if (response && response.data.status === 200) {
            notificationStore.addNotification(`Userstories created successfully on ${$settings.tool}`, 'success');
        }
    }

    function clearContent() {
        $appState.requirements = '';
        $appState.prd = '';
        $appState.userStories = [];
        notificationStore.addNotification('All content cleared', 'success');
    }

    // Show/hide the loading overlay
    let loadingOverlayVisible = $derived(loading);

    let generatePrdDisabled = $derived(!$appState.requirements.trim());

    // Enable/disable generate task button based on the generated PRD
    let generateTasksDisabled = $derived(!$appState.prd.trim());

    // Enable/disable auto-create tasks button based on the generated task array
    let createIssuesDisabled = $derived($appState.userStories.length <= 0);
</script>

<!-- Loading Overlay -->
<div
    id="loading-overlay"
    class:hidden={!loadingOverlayVisible}
    class="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center space-y-6 animate-fadeIn z-50"
    role="status"
    aria-live="polite"
    aria-labelledby="loading-text"
>
    <!-- Spinner animation -->
    <div class="spinner animate-spin w-16 h-16 border-4 border-t-transparent border-gray-100 rounded-full"></div>

    <!-- Loading text -->
    <p id="loading-text" class="text-4xl text-gray-100">Processing...</p>
</div>

<div class="bg-gradient-to-br from-black to-gray-900 text-gray-100 min-h-screen flex flex-col px-60 py-8 space-y-8">
    <!-- Note to setup settings before getting started -->
    <div class="bg-gray-800 text-gray-300 p-4 rounded-lg max-w-5xl shadow-md">
        <span>🚨 Please ensure your settings are configured properly before you begin. Go to your <a href="/settings" class="text-purple-400 hover:text-purple-300 transition-colors">settings page</a> to verify.</span>
        <br>
        <span>🚨 AutoProject can generate the starter PRD, user stories and tasks for a brand new project. It may not work well with other contexts.</span>
    </div>
    <!-- Grid Layout Section -->
    <!-- Requirements Box -->
    <div class="flex flex-col w-full max-w-5xl space-y-4">
        <label for="requirements" class="block font-semibold text-xl text-purple-400">Enter Requirement</label>
        <textarea id="requirements" class="w-full p-4 bg-gray-900 border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            bind:value={$appState.requirements} rows="1" placeholder="E.g. Build a webapp with xyz features using some techstack etc." aria-label="Enter Project Requirements"></textarea>
        <!-- Clear Content Button -->
        <div class="w-full flex justify-center space-x-4">
            <button id="generate-prd" onclick={generatePRD} disabled={generatePrdDisabled} class="bg-purple-700 hover:bg-purple-800 text-white py-3 px-5 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Generate Project Requirements Document">
                Generate PRD
            </button>
            <button
                onclick={clearContent}
                class="bg-red-700 hover:bg-red-800 text-white py-2 px-4 rounded-lg shadow-lg focus:outline-none"
                aria-label="Clear Content">
                Clear All Content
            </button>
        </div>
    </div>

    <div class={`w-full max-w-5xl grid ${$appState.userStories.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-8 p-4 rounded-lg`}>
        <!-- PRD Box -->
        <div class={`flex flex-col space-y-4 ${$appState.userStories.length > 0 ? 'p-2' : 'px-32'}`}>
            <label for="prd-display" class="block font-semibold text-xl text-green-400">Generated PRD</label>
            <textarea id="prd-display" class="cursor-default w-full p-6 bg-inherit border border-green-500 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                bind:value={$appState.prd} rows="14" placeholder="Generated PRD will appear here..." readonly aria-label="Generated Project Requirements Document"></textarea>
            <button id="generate-tasks" onclick={generateUserStories} disabled={generateTasksDisabled} class="bg-green-700 hover:bg-green-800 text-white py-3 px-5 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Generate Task Array">
                Generate User Stories
            </button>
        </div>

        <!-- Userstories Box -->
        {#if $appState.userStories.length > 0}
            <div class="flex flex-col space-y-4 p-2">
                <label for="user-stories" class="block text-xl font-semibold pl-2 text-yellow-500">Generated User Stories {`(${$appState.userStories.length})`}</label>
                <div id="user-stories" class="w-full h-96 overflow-auto">
                    {#each $appState.userStories as userStory}
                        <details class="space-y-2 p-2 rounded-lg border-t border-gray-600">
                            <summary class="cursor-pointer text-white p-2 rounded-lg hover:bg-gray-700">{userStory.title}</summary>
                            <div class="px-2">
                                <p class="mb-4 text-sm">{userStory.description}</p>
                            </div>
                        </details>
                    {/each}
                </div>
                <button id="create-tasks" onclick={createStories} disabled={createIssuesDisabled} class="bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-5 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Auto-Create Issues">
                    {`Auto-Create a new project on ${$settings.tool}`}
                </button>
            </div>
        {/if}
    </div>
</div>

<!-- Custom styles -->
<style>
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    .animate-fadeIn {
        animation: fadeIn 0.5s ease-in-out;
    }
</style>
