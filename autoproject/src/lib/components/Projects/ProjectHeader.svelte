<script lang="ts">
    let { selectedProject }: { selectedProject: any } = $props()

    const formatDate = (dateString: string) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }
</script>

<header class="flex-none px-6 py-5 border-b border-zinc-800">
    <div class="flex items-start justify-between">
        <div class="space-y-1 max-w-4xl">
            <div class="flex items-center gap-3">
                <h1 class="text-xl font-semibold text-white tracking-tight">
                    {selectedProject.name}
                </h1>
            </div>
            <p class="text-sm text-zinc-400 leading-relaxed">
                {selectedProject.description}
            </p>
        </div>
        <a 
            href={selectedProject.url} 
            target="_blank" 
            rel="noopener noreferrer"
            class="p-2 text-zinc-500 hover:text-purple-400 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Open external link"
        >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
        </a>
    </div>
    
    <div class="mt-4 flex items-center text-xs text-zinc-500 font-mono">
        <span>Updated {formatDate(selectedProject.updatedAt)}</span>
    </div>
</header>
