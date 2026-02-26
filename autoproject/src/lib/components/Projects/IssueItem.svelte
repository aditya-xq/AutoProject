<script lang="ts">
    import { marked } from 'marked'

    type IssueStatus = 'DONE' | 'UNDONE'
    type IssueDateField = 'updatedAt' | 'completedAt'

    type IssueItemProps = {
        issue: any
        expandedIssueId: string | null
        updatingIssues: Set<string>
        deletingIssues: Set<string>
        showDeleteConfirm: string | null
        completionAction: IssueStatus
        dateField: IssueDateField
        onToggleExpansion: (issueId: string) => void
        onUpdateStatus: (issueId: string, status: IssueStatus) => void
        onRequestDelete: (issueId: string) => void
        onConfirmDelete: (issueId: string) => void
        onCancelDelete: () => void
        onCopy: (issue: any) => void | Promise<void>
    }

    let {
        issue,
        expandedIssueId,
        updatingIssues,
        deletingIssues,
        showDeleteConfirm,
        completionAction,
        dateField,
        onToggleExpansion,
        onUpdateStatus,
        onRequestDelete,
        onConfirmDelete,
        onCancelDelete,
        onCopy
    }: IssueItemProps = $props()

    const formatDate = (dateString: string) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }

    const escapeHtml = (value: string) =>
        value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;')

    const renderDescription = (description: string) => marked.parse(escapeHtml(description))

    const preventInternalMarkdownNavigation = (node: HTMLElement) => {
        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null
            const link = target?.closest('a') as HTMLAnchorElement | null

            if (!link) return

            const href = link.getAttribute('href')
            if (!href) return

            try {
                const url = new URL(href, window.location.origin)
                if (url.origin === window.location.origin) {
                    event.preventDefault()
                    event.stopPropagation()
                }
            } catch {
                // Ignore invalid URLs from malformed markdown
            }
        }

        node.addEventListener('click', handleClick)

        return {
            destroy() {
                node.removeEventListener('click', handleClick)
            }
        }
    }

    const issueId = $derived(String(issue.id))
    const isDeleting = $derived(deletingIssues.has(issueId))
    const isUpdating = $derived(updatingIssues.has(issueId))
    const hasDescription = $derived(Boolean(issue.description))
    const isExpanded = $derived(expandedIssueId === issueId)
    const isDeleteConfirmVisible = $derived(showDeleteConfirm === issueId)
    const isCompletedView = $derived(completionAction === 'UNDONE')
    const issueDate = $derived(formatDate(issue?.[dateField] ?? ''))
</script>

<div 
    class="group rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden
    {isDeleting ? 'opacity-0 scale-95' : ''}"
>
    <div class="flex items-start gap-4 p-3">
        <button 
            type="button"
            onclick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onUpdateStatus(issueId, completionAction)
            }}
            disabled={isUpdating || isDeleting}
            class="mt-1 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 
            {isCompletedView
                ? 'bg-purple-400 border-purple-400 text-white'
                : 'bg-transparent border-zinc-600 hover:border-purple-400 text-transparent hover:text-purple-400'}
            disabled:opacity-50 disabled:cursor-not-allowed"
            title={isCompletedView ? 'Mark as incomplete' : 'Mark as complete'}
        >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        </button>

        <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
                <button
                    type="button"
                    onclick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onToggleExpansion(issueId)
                    }}
                    class="flex-1 text-left pr-4"
                    disabled={isDeleting}
                >
                    <h4 class="text-base font-medium text-zinc-200 truncate hover:text-white transition-colors">
                        {issue.title}
                    </h4>
                </button>
                <div class="flex items-center gap-3">
                    <span class="text-sm text-zinc-600 font-mono whitespace-nowrap">
                        {issueDate}
                    </span>
                    
                    <button 
                        type="button"
                        onclick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onCopy(issue)
                        }}
                        disabled={isDeleting}
                        class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-purple-400 transition-all duration-200 disabled:opacity-0"
                        title="Copy Story"
                    >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>

                    {#if isDeleteConfirmVisible}
                        <div class="flex items-center gap-2">
                            <button 
                                type="button"
                                onclick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onConfirmDelete(issueId)
                                }}
                                class="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                title="Confirm Delete"
                            >
                                Delete
                            </button>
                            <button 
                                type="button"
                                onclick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onCancelDelete()
                                }}
                                class="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
                                title="Cancel"
                            >
                                Cancel
                            </button>
                        </div>
                    {:else}
                        <button 
                            type="button"
                            onclick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onRequestDelete(issueId)
                            }}
                            disabled={isDeleting}
                            class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all duration-200 disabled:opacity-0"
                            title="Delete Story"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    {/if}

                    {#if hasDescription}
                        <button
                            type="button"
                            onclick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                onToggleExpansion(issueId)
                            }}
                            disabled={isDeleting}
                            class="text-zinc-600 hover:text-zinc-400 transition-all duration-200 disabled:opacity-50"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            <svg 
                                class="w-4 h-4 transition-transform duration-300 {isExpanded ? 'rotate-180' : ''}" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    {/if}
                </div>
            </div>
            
            {#if hasDescription}
                <div class="accordion-content {isExpanded ? 'expanded' : ''}">
                    <div class="accordion-inner pt-2">
                        <div class="prose prose-invert max-w-none text-zinc-500 text-sm" use:preventInternalMarkdownNavigation>
                            {@html renderDescription(issue.description)}
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Accordion animation */
    .accordion-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .accordion-content.expanded {
        max-height: 500px;
    }

    .accordion-inner {
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .accordion-content.expanded .accordion-inner {
        opacity: 1;
        transform: translateY(0);
    }
</style>
