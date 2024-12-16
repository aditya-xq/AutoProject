<script lang="ts">
    import "../app.css";
    import { page } from '$app/stores';
    import { NotificationBar, Loading, Footer } from "$lib/components";

    let menuOpen = false;
    let scrollY: number;

    // Function to determine whether a link is active
    function isActive(path: string) {
        return $page.url.pathname === path;
    }

    function toggleMenu() {
        menuOpen = !menuOpen;
    }
</script>

<svelte:window bind:scrollY={scrollY}/>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 AutoProject</title>
    <meta charset="UTF-8">
</svelte:head>

<!-- Floating Header for All Screens -->
<header class="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50 backdrop-blur-md bg-black/75 rounded-2xl shadow-lg shadow-purple-500/20 transition-all duration-300 {scrollY > 20 ? 'py-2' : 'py-4'}">
    <div class="container mx-auto px-4">
        <div class="flex items-center justify-between">
            <a href="/" class="flex items-center space-x-2">
                <span class="text-2xl">🚀</span>
                <h1 class="text-2xl font-bold text-purple-400">AutoProject</h1>
            </a>

            <!-- Desktop Navigation -->
            <nav class="hidden md:flex items-center space-x-6">
                <a href="/" class={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</a>
                <a href="/projects" class={`nav-link ${isActive('/projects') ? 'active' : ''}`}>Projects</a>
                <a href="/settings" class={`nav-link ${isActive('/settings') ? 'active' : ''}`}>Settings</a>
                <a href="/about" class={`nav-link ${isActive('/about') ? 'active' : ''}`}>About</a>
            </nav>

            <!-- Mobile Menu Button -->
            <button class="md:hidden p-2 text-gray-100 rounded-lg focus:outline-none" on:click={toggleMenu}>
                {#if menuOpen}
                    ✖️
                {:else}
                    ☰
                {/if}
            </button>
        </div>
    </div>
</header>

<!-- Mobile Menu Overlay -->
<div class={`fixed inset-0 z-40 bg-black/95 backdrop-blur-lg transform transition-transform duration-300 ${menuOpen ? 'translate-y-0' : '-translate-y-full'} md:hidden`}>
    <div class="flex flex-col items-center justify-center h-full space-y-8">
        <a href="/" class={`mobile-nav-link ${isActive('/') ? 'active' : ''}`} on:click={toggleMenu}>Home</a>
        <a href="/projects" class={`mobile-nav-link ${isActive('/projects') ? 'active' : ''}`} on:click={toggleMenu}>Projects</a>
        <a href="/settings" class={`mobile-nav-link ${isActive('/settings') ? 'active' : ''}`} on:click={toggleMenu}>Settings</a>
        <a href="/about" class={`mobile-nav-link ${isActive('/about') ? 'active' : ''}`} on:click={toggleMenu}>About</a>
    </div>
</div>

<NotificationBar/>
<Loading/>

<main class="pt-28 bg-neutral-950">
    <slot/>
    <Footer/>
</main>

<style>
    @import "tailwindcss/theme";
    .nav-link {
        @apply px-4 py-2 text-gray-300 rounded-lg transition-all duration-300 hover:text-white hover:bg-purple-500/20;
    }

    .nav-link.active {
        @apply bg-purple-600 text-white;
    }

    .mobile-nav-link {
        @apply text-2xl text-gray-300 py-4 px-8 rounded-xl transition-all duration-300 hover:text-white hover:bg-purple-500/20;
    }

    .mobile-nav-link.active {
        @apply bg-purple-600 text-white;
    }

    main {
        min-height: 100vh;
    }
</style>