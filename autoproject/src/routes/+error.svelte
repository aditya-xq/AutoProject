<script lang="ts">
	import { page } from '$app/state'

    const title = $derived(() => {
        if (page.status === 404) return 'Page not found'
        if (page.status === 401) return 'Unauthorized'
        if (page.status === 403) return 'Access forbidden'
        if (page.status >= 500) return 'Something went wrong'
        return 'Unexpected error'
    })

    const description = $derived(() => {
        if (page.status === 404) {
            return "The page you're looking for doesn’t exist or may have been moved."
        }
        if (page.status >= 500) {
            return "This is likely a temporary issue. You can try again in a moment."
        }
        return "Something didn’t go as expected."
    })

    const message = $derived(page.error?.message?.length
            ? page.error.message
            : title
    )
</script>

<div class="min-h-[60vh] flex items-center justify-center px-6">
    <div class="max-w-md text-center space-y-6">
        <div class="text-7xl font-semibold text-zinc-400">
            {page.status}
        </div>
        <h1 class="text-2xl font-medium text-zinc-200">
            {message}
        </h1>
        <p class="text-sm text-zinc-500 leading-relaxed">
            {description()}
        </p>
        <div class="flex items-center justify-center gap-3 pt-4">
            <a
                href="/"
                class="px-5 py-2.5 text-sm font-medium rounded-lg
                       bg-white/5 text-zinc-200
                       hover:bg-white/10
                       transition"
            >
                Go home
            </a>
        </div>
        <p class="pt-6 text-xs text-zinc-600">
            If this keeps happening, it’s probably a bug — not you.
        </p>
    </div>
</div>
