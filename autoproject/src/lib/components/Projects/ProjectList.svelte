<script lang="ts">
    import { appState } from '$lib/state.svelte'

    type ProjectListProps = {
        searchQuery?: string
        selectedProjectId: string | null
        onSelectProject: (id: string) => void
    }

    let {
        searchQuery = $bindable(''),
        selectedProjectId,
        onSelectProject
    }: ProjectListProps = $props()

    const filteredProjects = $derived(
        searchQuery
            ? appState.projects.filter((project: any) => {
                const name = (project.name ?? '').toLowerCase()
                const description = (project.description ?? '').toLowerCase()
                const query = searchQuery.toLowerCase()

                return name.includes(query) || description.includes(query)
            })
            : appState.projects
    )

    const isSelected = (projectId: string | number) =>
        selectedProjectId !== null && String(projectId) === selectedProjectId
</script>

<div class="p-4 border-b border-zinc-800">
    <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-semibold text-zinc-500 uppercase tracking-wider">Projects</h2>
        <span class="text-sm text-zinc-600">{appState.settings.tool}</span>
    </div>
    <div class="relative">
        <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search..."
            class="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
        />
    </div>
</div>

<div class="flex-1 overflow-y-auto scrollbar-thin">
    {#if filteredProjects.length > 0}
        <div class="p-2 space-y-1">
            {#each filteredProjects as project (project.id)}
                <button 
                    type="button"
                    onclick={(event) => {
                        event.preventDefault()
                        onSelectProject(String(project.id))
                    }}
                    class="group w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 border border-transparent
                    {isSelected(project.id)
                        ? 'bg-zinc-800 text-white shadow-sm border-zinc-700' 
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
                >
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="font-medium text-sm truncate">{project.name}</div>
                    </div>
                </button>
            {/each}
        </div>
    {:else}
        <div class="p-6 text-center text-xs text-zinc-600">
            No matching projects
        </div>
    {/if}
</div>
