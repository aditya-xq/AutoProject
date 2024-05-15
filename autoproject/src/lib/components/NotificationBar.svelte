<script lang="ts">
    import { notificationStore, type NotificationType } from "$lib/store";
    
    let notifications: NotificationType[] = [];

    notificationStore.subscribe(value => {
        notifications = value;
    });

    function removeNotification(id: number): void {
        notificationStore.removeNotification(id);
    }
</script>

<div class="fixed top-4 right-4 flex flex-col space-y-2 z-50">
    {#each notifications as { id, type, message }}
        <div class={`flex justify-between items-center p-4 rounded-xl shadow-lg text-white 
                    ${type === 'error' ? 'bg-red-600' : 
                     type === 'success' ? 'bg-green-600' : 'bg-blue-600'}`}>
            <p class="flex-1">{message}</p>
            <button onclick={() => removeNotification(id)}
                    class="ml-4 w-6 h-6 flex items-center justify-center text-gray-900 bg-white text-current rounded-full"
                    aria-label="Close">
                &#x2715;
            </button>
        </div>
    {/each}
</div>
