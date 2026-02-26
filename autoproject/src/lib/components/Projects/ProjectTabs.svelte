<script lang="ts">
    type ProjectTab = 'open' | 'completed'

    type ProjectTabsProps = {
        activeTab: ProjectTab
        openCount: number
        completedCount: number
        onSetActiveTab: (tab: ProjectTab) => void
    }

    let { activeTab, openCount, completedCount, onSetActiveTab }: ProjectTabsProps = $props()
</script>

<div class="flex-none border-b border-zinc-800">
    <div class="px-6 flex gap-6">
        <button
            type="button"
            onclick={(event) => {
                event.preventDefault()
                onSetActiveTab('open')
            }}
            class="relative px-1 py-3 text-sm font-medium transition-colors
            {activeTab === 'open' 
                ? 'text-purple-400' 
                : 'text-zinc-500 hover:text-zinc-300'}"
        >
            Open
            <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono
            {activeTab === 'open' 
                ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}">
                {openCount}
            </span>
            {#if activeTab === 'open'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            {/if}
        </button>
        <button
            type="button"
            onclick={(event) => {
                event.preventDefault()
                onSetActiveTab('completed')
            }}
            class="relative px-1 py-3 text-sm font-medium transition-colors
            {activeTab === 'completed' 
                ? 'text-purple-400' 
                : 'text-zinc-500 hover:text-zinc-300'}"
        >
            Completed
            <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono
            {activeTab === 'completed' 
                ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}">
                {completedCount}
            </span>
            {#if activeTab === 'completed'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            {/if}
        </button>
    </div>
</div>
