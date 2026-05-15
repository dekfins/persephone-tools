import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import Inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [svelte(), Inspect()],
})