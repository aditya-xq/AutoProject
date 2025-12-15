<script lang="ts">
    import { notificationStore, type NotificationType } from "$lib/store"
    import { fade, fly } from 'svelte/transition'
    
    let notifications: NotificationType[] = []

    notificationStore.subscribe((value) => {
        notifications = value
    })

    function removeNotification(id: number): void {
        notificationStore.removeNotification(id)
    }
</script>

<div class="fixed top-4 right-4 sm:top-6 sm:right-6 flex flex-col space-y-3 z-50">
    {#each notifications as { id, type, message } (id)}
        <div 
            in:fly="{{ x: 50, duration: 300 }}"
            out:fade="{{ duration: 200 }}"
            class={`flex flex-row items-center p-4 rounded-lg shadow-lg text-white min-w-75 max-w-md transform transition-all
                    ${type === 'error' ? 'bg-linear-to-r from-red-600 to-red-700 border-l-4 border-red-800' : 
                     type === 'success' ? 'bg-linear-to-r from-green-600 to-green-700 border-l-4 border-green-800' : 
                     'bg-linear-to-r from-blue-600 to-blue-700 border-l-4 border-blue-800'}`}>
            <div class="flex-1 pr-2">
                <div class="flex items-center space-x-2">
                    {#if type === 'error'}
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    {:else if type === 'success'}
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    {:else}
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    {/if}
                    <p class="text-sm font-medium">{message}</p>
                </div>
            </div>
            <button 
                onclick={() => removeNotification(id)}
                class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200"
                aria-label="Close">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    {/each}
</div>

<style>
    :global(.notification-enter) {
        transform: translateX(100%);
        opacity: 0;
    }
    :global(.notification-enter-active) {
        transform: translateX(0);
        opacity: 1;
        transition: all 300ms ease-out;
    }
    :global(.notification-exit) {
        opacity: 1;
    }
    :global(.notification-exit-active) {
        opacity: 0;
        transition: all 200ms ease-in;
    }
</style>
