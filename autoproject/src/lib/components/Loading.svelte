<script lang="ts">
    import { appState } from "$lib/state.svelte";
</script>

<!-- Loading Overlay -->
<div
    id="loading-overlay"
    class:hidden={!appState.isLoading}
    class="fixed inset-0 bg-black/60 flex flex-col items-center justify-center space-y-6 animate-fadeIn z-50"
    role="status"
    aria-live="polite"
    aria-labelledby="loading-text"
>
    <!-- Spinner animation -->
    <div class="spinner animate-spin w-16 h-16 border-4 border-t-transparent border-green-500 rounded-full"></div>

    <!-- Loading text -->
    <p id="loading-text" class="text-4xl text-green-500">Processing</p>
</div>