import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss(),
	],
	server: {
		hmr: {
			overlay: false,
		}
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('state.svelte')) {
						return 'state-chunk'
					}
				}
			}
		}
	}
})
