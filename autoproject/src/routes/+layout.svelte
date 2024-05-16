<script lang="ts">
    import "../app.css";
    import { page } from '$app/stores';
    import NotificationBar from "$lib/components/NotificationBar.svelte";

    let menuOpen = false;

    // Function to determine whether a link is active
    function isActive(path: string) {
        return $page.url.pathname === path;
    }

    function toggleMenu() {
        menuOpen = !menuOpen;
    }
</script>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 AutoProject</title>
    <meta charset="UTF-8">
</svelte:head>

<div class="max-md:hidden"><NotificationBar/></div>

<!-- Mobile Header with Project Name -->
<header class="fixed top-0 left-0 p-4 z-50 w-full bg-black md:hidden">
    <NotificationBar/>
    <a href="/" class="flex items-center space-x-2">
        <span class="text-2xl">🚀</span>
        <h1 class="text-2xl font-bold text-purple-400">AutoProject</h1>
    </a>
    <!-- Mobile Menu Button -->
    <button class="fixed top-3 right-4 z-50 p-2 text-gray-100 rounded-lg focus:outline-none md:hidden" on:click={toggleMenu}>
        {#if menuOpen}
            ✖️
        {:else}
            ☰
        {/if}
    </button>
</header>

<!-- Full-Screen Overlay Menu for Mobile -->
<div class={`fixed z-200 inset-0 bg-gradient-to-b from-gray-900 to-black text-gray-100 flex flex-col items-center justify-center transition-transform duration-300 transform ${menuOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden`}>
    <div class="flex-grow w-full flex flex-col items-center space-y-8 mt-40">
        <!-- Links with conditional class for active route -->
        <a href="/" class={`hover:bg-gray-800 rounded-md py-4 px-8 text-center text-2xl ${isActive('/') ? 'bg-purple-700' : ''}`} on:click={toggleMenu}>Home</a>
        <a href="/about" class={`hover:bg-gray-800 rounded-md py-4 px-8 text-center text-2xl ${isActive('/about') ? 'bg-purple-700' : ''}`} on:click={toggleMenu}>About</a>
        <a href="/settings" class={`hover:bg-gray-800 rounded-md py-4 px-8 text-center text-2xl ${isActive('/settings') ? 'bg-purple-700' : ''}`} on:click={toggleMenu}>Settings</a>
    </div>
</div>

<!-- Navigation Bar for Larger Screens -->
<nav class="hidden md:flex fixed top-0 left-0 h-screen w-54 bg-black text-gray-100 flex-col items-center py-6 px-4 space-y-6">
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

<main class="max-md:pt-16 bg-gradient-to-b from-black to-gray-900 md:pl-54">
    <slot/>
</main>

<style>
    main {
        transition: padding-left 0.3s ease;
    }
</style>
