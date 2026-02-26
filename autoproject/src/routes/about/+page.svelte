<script lang="ts">
  import { modelGuide, quickPresets } from './content.config'
</script>

<div class="container mx-auto max-w-5xl text-gray-100 px-4 py-6 space-y-8">
    <!-- Title Section -->
    <h1 class="text-xl md:text-2xl font-bold text-purple-400">&#x1F680; Welcome to AutoProject</h1>
    <p class="max-w-xl md:max-w-4xl">
        Your ultimate BYOK tool to automate project management with AI-powered workflows. Craft your project user stories with the precision of a rocket engineer and the ease of autopilot.
    </p>

    <!-- Features Section -->
    <div class="space-y-4 max-w-xl md:max-w-4xl">
        <h2 class="text-lg md:text-xl font-semibold text-green-400">&#x1F31F; Key Features</h2>
        <ul class="list-disc pl-6 space-y-1">
            <li><strong>Generative PRD Creation:</strong> Feed your requirements and receive a tailor-made PRD that aligns perfectly with your workflow.</li>
            <li><strong>AI-Powered Userstory Generation:</strong> The AI effortlessly transforms your PRD into a smart, structured userstories in your configured format.</li>
            <li><strong>Tool Integration:</strong> Push the generated userstories as a new project straight to your chosen tool (Linear/Asana/Jira/Plane) with one click. Instant project magic!</li>
        </ul>
    </div>

    <!-- Getting Started Section -->
    <div class="space-y-4 max-w-xl md:max-w-5xl">
        <h2 class="text-lg md:text-xl font-semibold text-blue-400">&#x1F680; Getting Started</h2>
        <p>
            Start your journey with AutoProject and let AI automate your project workflows:
        </p>
        <ul class="list-decimal pl-6 space-y-1">
            <li><strong>Generate PRD:</strong> Describe your requirements and click the "Generate PRD" button.</li>
            <li><strong>Generate User Stories:</strong> Review the PRD and hit "Generate Userstories" to let the AI do the heavy lifting.</li>
            <li><strong>Push to Tool:</strong> Finalize your tasks and sync them with your PM tool for seamless integration.</li>
        </ul>
    </div>

    <!-- Quick Settings Presets -->
    <div class="space-y-6 max-w-xl md:max-w-5xl">
        <h2 class="text-lg md:text-xl font-semibold text-pink-400 flex items-center gap-2">
            <span>&#x26A1;</span>
            <span>Quick Settings Presets</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each quickPresets as preset}
                <div class="bg-black p-6 rounded-xl border border-gray-800 hover:border-white transition-all duration-300">
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-2xl">{preset.icon}</span>
                    <h3 class="text-lg font-medium text-white">{preset.title}</h3>
                </div>

                <ul class="space-y-3">
                    {#each preset.items as [label, value]}
                    <li class="flex justify-between items-center">
                        <span class="text-gray-400 text-sm">{label}</span>
                        <span class="text-white">{value}</span>
                    </li>
                    {/each}
                </ul>

                <div class="h-px bg-gray-800 my-4"></div>

                <p class="text-sm text-gray-400">{preset.description}</p>
                </div>
            {/each}
        </div>
    </div>

    <!-- Model & Settings Guide -->
    <div class="space-y-8 max-w-xl md:max-w-5xl">
        <h2 class="text-lg md:text-xl font-semibold text-orange-400 flex items-center gap-2">
            <span>&#x1F3AF;</span>
            <span>Model & Settings Guide</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {#each modelGuide as card}
                <div class="bg-black p-6 rounded-xl border border-gray-800 hover:border-white transition-all duration-300">
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-2xl">{card.icon}</span>
                    <h3 class="text-lg font-medium text-white">{card.title}</h3>
                </div>

                <div class="space-y-4">
                    {#each card.sections as section}
                    {#if Array.isArray(section)}
                        <div class="space-y-1">
                        <h4 class={card.accent}>{section[0]}</h4>
                        <p class="text-xs text-gray-400">Best for: {section[1]}</p>
                        </div>
                    {:else}
                        <div class="space-y-1">
                        <h4 class="text-purple-400">{section.title}</h4>
                        <p class="text-sm text-gray-300">{section.detail}</p>
                        <p class="text-xs text-gray-400">{section.hint}</p>
                        </div>
                    {/if}
                    {/each}
                </div>
                </div>
            {/each}
        </div>
    </div>

    <!-- Fun Outro -->
    <div class="space-y-4 max-w-xl md:max-w-5xl">
        <h2 class="text-lg md:text-xl font-semibold text-yellow-400">&#x1F3AF; Hit the Bullseye</h2>
        <p>
            With AutoProject, you're not just managing projects - you're pioneering a whole new way to organize, automate, and execute with precision. Unleash the power of AI and propel your projects into orbit!
        </p>
    </div>

    <!-- Feedback Section -->
    <div class="space-y-4 max-w-xl md:max-w-5xl">
        <h2 class="text-lg md:text-xl font-semibold text-pink-400">&#x1F4AC; We Want Your Feedback!</h2>
        <p>
            Help us make AutoProject even better! If you have suggestions, questions, or just want to share your excitement, reach out to us on Twitter.
        </p>
        <div><a href="https://twitter.com/intent/tweet?screen_name=xq_is_here&text=Hey%20there%20AutoProject%20team%2C%20I%20wanted%20to%20share%20my%20thoughts%20on%20your%20tool..." target="_blank" class="bg-pink-600 hover:bg-pink-700 text-white text-xs py-2 px-4 rounded-2xl shadow-lg focus:outline-hidden focus:ring-2 focus:ring-pink-400">
            Tweet to @xq_is_here
        </a></div>
    </div>
</div>
