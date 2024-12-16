<footer class="w-full bg-black/80 backdrop-blur-md mt-20 border-t border-purple-500/20">
    <div class="max-w-7xl mx-auto px-4 py-12">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Brand Section -->
            <div class="space-y-4">
                <div class="flex items-center space-x-2">
                    <span class="text-2xl">🚀</span>
                    <h2 class="text-xl font-bold text-purple-400">AutoProject</h2>
                </div>
                <p class="text-gray-400">Your ultimate tool to automate product and project management with AI-powered workflows.</p>
            </div>

            <!-- Quick Links -->
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-white">Quick Links</h3>
                <div class="flex flex-col space-y-2">
                    <a href="/" class="text-gray-400 hover:text-purple-400 transition-colors">Home</a>
                    <a href="/projects" class="text-gray-400 hover:text-purple-400 transition-colors">Projects</a>
                    <a href="/settings" class="text-gray-400 hover:text-purple-400 transition-colors">Settings</a>
                    <a href="/about" class="text-gray-400 hover:text-purple-400 transition-colors">About</a>
                </div>
            </div>

            <!-- Connect Section -->
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-white">Connect</h3>
                <div class="flex flex-col space-y-2">
                    <a href="https://github.com/aditya-xq/AutoProject" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-purple-400 transition-colors flex items-center space-x-2">
                        <span>GitHub</span>
                    </a>
                </div>
            </div>
        </div>

        <div class="mt-12 pt-8 border-t border-purple-500/20">
            <p class="text-center text-gray-400 text-sm">
                © {new Date().getFullYear()} AutoProject by xqbuilds. All rights reserved.
            </p>
        </div>
    </div>
</footer>

<style>
    @import "tailwindcss/theme";
    footer a {
        @apply inline-block;
    }
</style>