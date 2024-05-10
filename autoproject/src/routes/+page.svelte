<script lang="ts">    
    let requirements = $state('');
    let prd = $state('');
    let taskArray = $state('');
    let loading = $state(false);
    let successVisible = $state(false);

    async function generatePRD() {
        loading = true;
        const response = await fetch(`/api/generate-prd`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirements })
        });
        const data = await response.json();
        prd = data.prd;
        loading = false;
    }

    async function generateTasks(prd: string) {
        loading = true;
        const response = await fetch(`/api/generate-tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prd })
        });
        const data = await response.json();
        taskArray = JSON.stringify(data.tasks, null, 4);
        loading = false;
    }

    async function createTasks(taskArray: string) {
        loading = true;
        const response = await fetch(`/api/create-tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: JSON.parse(taskArray) })
        });
        const data = await response.json();
        console.log(data.message);
        loading = false;
        successVisible = true;
        setTimeout(() => {
            successVisible = false;
        }, 3000);
    }

    function clearContent() {
        requirements = '';
        prd = '';
        taskArray = '';
    }

    // Show/hide the loading overlay
    let loadingOverlayVisible = $derived(loading);

    let generatePrdDisabled = $derived(!requirements.trim());

    // Enable/disable generate task button based on the generated PRD
    let generateTasksDisabled = $derived(!prd.trim());

    // Enable/disable auto-create tasks button based on the generated task array
    let createTasksDisabled = $derived(!taskArray.trim());
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

<!-- Success Message -->
<div id="success-message" class:hidden={!successVisible} class="fixed top-8 right-8 bg-green-600 text-white py-3 px-5 rounded-lg">
    Tasks successfully created as issues on Linear!
</div>

<div class="bg-gradient-to-br from-black to-gray-900 text-gray-100 min-h-screen flex flex-col p-8 ml-60 pl-20 space-y-8">
    <!-- Grid Layout Section -->
    <!-- Requirements Box -->
    <div class="flex flex-col w-full max-w-5xl space-y-4">
        <label for="requirements" class="block text-xl text-purple-400">Enter Requirement</label>
        <textarea id="requirements" class="w-full p-6 bg-gray-900 border border-purple-500 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            bind:value={requirements} rows="2" placeholder="E.g. Build a webapp with xyz features using some techstack etc." aria-label="Enter Project Requirements"></textarea>
        <!-- Clear Content Button -->
        <div class="w-full flex justify-end space-x-4">
            <button id="generate-prd" onclick={generatePRD} disabled={generatePrdDisabled} class="bg-purple-700 hover:bg-purple-800 text-white py-3 px-5 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Generate Project Requirements Document">
                Generate PRD
            </button>
            <button
                onclick={clearContent}
                class="bg-red-700 hover:bg-red-800 text-white py-2 px-4 rounded-2xl shadow-lg focus:outline-none"
                aria-label="Clear Content">
                Clear All Content
            </button>
        </div>
    </div>

    <div class="w-full max-w-5xl grid grid-cols-2 gap-10 p-4 rounded-lg">
        <!-- PRD Box -->
        <div class="flex flex-col space-y-4">
            <label for="prd-display" class="block text-xl text-green-400">Generated PRD</label>
            <textarea id="prd-display" class="cursor-default w-full p-6 bg-gray-900 border border-green-500 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                bind:value={prd} rows="14" placeholder="Generated PRD will appear here..." readonly aria-label="Generated Project Requirements Document"></textarea>
            <button id="generate-tasks" onclick={() => generateTasks(prd)} disabled={generateTasksDisabled} class="bg-green-700 hover:bg-green-800 text-white py-3 px-5 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Generate Task Array">
                Generate Tasks
            </button>
        </div>

        <!-- Task Array Box -->
        <div class="flex flex-col space-y-4">
            <label for="task-array" class="block text-xl text-yellow-400">Generated Tasks</label>
            <textarea id="task-array" class="cursor-default w-full p-6 bg-gray-900 border border-yellow-500 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                bind:value={taskArray} rows="14" placeholder="Generated Task Array will appear here..." readonly aria-label="Generated Task Array"></textarea>
            <button id="create-tasks" onclick={() => createTasks(taskArray)} disabled={createTasksDisabled} class="bg-yellow-700 hover:bg-yellow-800 text-white py-3 px-5 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Auto-Create Issues in Linear">
                Auto-Create as issues on Linear
            </button>
        </div>
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
