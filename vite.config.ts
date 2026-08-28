import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: { target: 'es2022', outDir: 'dist', sourcemap: true },
  server: { proxy: { '/api': 'http://localhost:8080', '/health': 'http://localhost:8080' } }
});
