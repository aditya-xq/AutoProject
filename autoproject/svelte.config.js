import adapter from "svelte-adapter-bun"
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess({ script: true }),
	kit: {
		adapter: adapter()
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
}

export default config
