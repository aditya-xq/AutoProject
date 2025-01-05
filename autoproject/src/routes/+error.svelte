<script lang="ts">
    import { page } from '$app/stores';
  
    const getErrorMessage = (status: number) => {
      switch (status) {
        case 404:
          return 'Page not found';
        case 500:
          return 'Internal server error';
        case 403:
          return 'Access forbidden';
        case 401:
          return 'Unauthorized access';
        default:
          return 'An error occurred';
      }
    };
</script>
  
<div class="min-h-[50vh] flex items-center justify-center">
    <div class="text-center px-8">
        <h1 class="text-8xl font-bold mb-4 text-gray-400">
            {$page.status}
        </h1>
        <p class="text-2xl mb-8 text-gray-400">
            {$page.error?.message || getErrorMessage($page.status)}
        </p>
        <div class="space-y-4">
            <p class="text-neutral-600 dark:text-neutral-400">
            {$page.status === 404 
                ? "The page you're looking for doesn't exist or has been moved."
                : "We're working on fixing this issue. Please try again later."}
            </p>
            <a
            href="/"
            class="inline-block px-6 py-3 text-sm font-medium bg-primary hover:bg-primary/90 text-purple-400 rounded-lg transition-colors duration-200"
            >
            Return Home
            </a>
        </div>
    </div>
</div>