<script lang="ts">
    import "../app.css";
    import { page } from '$app/stores';
    import NotificationBar from "$lib/components/NotificationBar.svelte";

    // Function to determine whether a link is active
    function isActive(path: string) {
        return $page.url.pathname === path;
    }
</script>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 AutoProject</title>
    <meta charset="UTF-8">
</svelte:head>

<NotificationBar/>

<nav class="fixed top-0 left-0 h-screen w-54 bg-gradient-to-b from-gray-900 to-black text-gray-100 flex flex-col items-center py-6 px-4 space-y-6">
    <!-- Brand Header -->
    <a href="/" class="flex items-center space-x-2">
        <span class="text-xl">🚀</span>
        <h1 class="text-xl font-bold text-purple-400">AutoProject</h1>
    </a>
    <div class="flex-grow w-full flex flex-col mt-8 space-y-4">
        <!-- Links with conditional class for active route -->
        <a href="/" class={`hover:bg-gray-800 rounded-md py-2 px-4 text-center ${isActive('/') ? 'bg-purple-700' : ''}`}>Home</a>
        <a href="/about" class={`hover:bg-gray-800 rounded-md py-2 px-4 text-center ${isActive('/about') ? 'bg-purple-700' : ''}`}>About</a>
        <a href="/settings" class={`hover:bg-gray-800 rounded-md py-2 px-4 text-center ${isActive('/settings') ? 'bg-purple-700' : ''}`}>Settings</a>
    </div>
</nav>

<slot/>
