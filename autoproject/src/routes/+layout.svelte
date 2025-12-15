<script lang="ts">
    import "../app.css"
    import { page } from '$app/state'
    import { NotificationBar, Loading, Footer } from "$lib/components"
    import { fly, fade } from 'svelte/transition'
    let { children } = $props()

    let menuOpen = $state(false)
    let scrollY: number = $state(0)

    // Helper to check active state
    function isActive(path: string) {
        return page.url.pathname === path
    }

    function toggleMenu() {
        menuOpen = !menuOpen
    }

    // Close menu when clicking a link
    function closeMenu() {
        menuOpen = false
    }
</script>

<svelte:window bind:scrollY={scrollY}/>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoProject</title>
    <meta charset="UTF-8">
</svelte:head>

<header 
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-b border-transparent
    {scrollY > 20 ? 'py-3 bg-black/50 backdrop-blur-xl border-white/5 shadow-2xl shadow-black/40' : 'py-6 bg-transparent'}"
>
    <div class="container mx-auto px-6 max-w-7xl">
        <div class="flex items-center justify-between">
            <a href="/" class="group flex items-center gap-3" onclick={closeMenu}>
                <div class="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>
                </div>
                <span class="text-xl font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
                    AutoProject
                </span>
            </a>

            <nav class="hidden md:flex items-center gap-1 rounded-full px-2 py-1 border border-white/5">
                {#each [
                    { path: '/', label: 'Home' },
                    { path: '/projects', label: 'Projects' },
                    { path: '/settings', label: 'Settings' },
                    { path: '/about', label: 'About' }
                ] as link}
                    <a 
                        href={link.path} 
                        class="px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 
                        {isActive(link.path) 
                            ? 'bg-white/10 text-white shadow-sm' 
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
                    >
                        {link.label}
                    </a>
                {/each}
            </nav>

            <button 
                class="md:hidden p-2 text-zinc-300 hover:text-white active:scale-95 transition-transform" 
                onclick={toggleMenu}
                aria-label="Toggle menu"
            >
                {#if menuOpen}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                {:else}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                {/if}
            </button>
        </div>
    </div>
</header>

{#if menuOpen}
    <div 
        class="fixed inset-0 z-40 bg-black/90 backdrop-blur-xl md:hidden flex flex-col items-center justify-center"
        transition:fade={{ duration: 200 }}
    >
        <div class="flex flex-col items-center space-y-6" in:fly={{ y: 20, duration: 300, delay: 100 }}>
            {#each [
                { path: '/', label: 'Home' },
                { path: '/projects', label: 'Projects' },
                { path: '/settings', label: 'Settings' },
                { path: '/about', label: 'About' }
            ] as link}
                <a 
                    href={link.path} 
                    class="text-3xl font-light tracking-tight transition-colors duration-200
                    {isActive(link.path) ? 'text-white font-medium scale-105' : 'text-zinc-500 hover:text-zinc-300'}"
                    onclick={closeMenu}
                >
                    {link.label}
                </a>
            {/each}
        </div>
    </div>
{/if}

<NotificationBar/>
<Loading/>

<main class="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-purple-500/30">
    <div class="pt-28">
        {@render children()}
    </div>
    <Footer/>
</main>
