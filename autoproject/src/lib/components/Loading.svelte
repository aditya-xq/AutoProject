<script lang="ts">
    import { appState } from "$lib/state.svelte";
</script>

<div
    id="loading-overlay"
    class:hidden={!appState.isLoading}
    class="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-12 animate-fadeIn z-100"
    role="status"
    aria-live="polite"
    aria-labelledby="loading-text"
>

    <!-- Clean Text Display -->
    <div class="font-mono flex flex-col items-center space-y-3">
        <div class="text-green-400/90 text-3xl tracking-widest">
            {appState.loadingText}
        </div>
        <div class="flex space-x-2">
            {#each Array(3) as _, i}
                <div 
                    class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"
                    style="animation-delay: {i * 0.15}s"
                ></div>
            {/each}
        </div>
    </div>
</div>

<style>
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .animate-fadeIn {
        animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>
