import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // PocketBase serves pb_public/ directly; index.html is the SPA fallback.
      pages: 'pb_public',
      assets: 'pb_public',
      fallback: 'index.html',
    }),
  },
}

export default config
