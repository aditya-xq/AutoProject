<script lang="ts">
    import { ChatUX } from "$lib/components";
    import { appState } from "$lib/state.svelte";
    let generatePrdDisabled = $derived(!appState.requirements.trim())
</script>

<div class="bg-gray-950 text-gray-100 min-h-screen flex flex-col px-4 sm:px-8 md:px-16 lg:px-32 xl:px-60 py-8 space-y-6">
    <!-- Note to setup settings before getting started -->
    <div class="bg-gray-900 text-gray-300 p-4 rounded-lg max-w-4xl mx-auto">
        <span>🚨 Don't forget to configure your <a href="/settings" class="text-violet-400 transition-colors">settings page</a> before getting started. AutoProject can generate starter PRDs and user stories but remember that it is prone to errors.</span>
    </div>

    <!-- Requirements Box -->
    <div class="flex flex-col w-full max-w-6xl mx-auto space-y-4 max-sm:px-4">
        <label for="requirements" class="block font-semibold text-lg md:text-2xl text-purple-400">Requirement</label>
        <ChatUX generatePrdDisabled={generatePrdDisabled}/>
    </div>
</div>
