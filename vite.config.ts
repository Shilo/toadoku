import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { integrity, pwaRelease } from './tools/pwa/build.ts';

export default defineConfig({
  plugins: [svelte(), pwaRelease(), VitePWA({
    strategies: 'injectManifest', srcDir: 'src/lib/pwa', filename: 'worker.ts',
    injectRegister: null, registerType: 'prompt', includeManifestIcons: false,
    integration: { closeBundleOrder: 'post' },
    manifest: {
      id: './', name: 'Toadoku', short_name: 'Toadoku', description: 'A quiet pond Sudoku game.',
      start_url: './', scope: './', display: 'standalone', background_color: '#B6BA86', theme_color: '#6D9F81',
      icons: [{ src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    },
    injectManifest: {
      globPatterns: ['index.html', 'assets/**/*.{js,css,ttf,woff,woff2,png,svg,webp}', 'pwa/*.{png,svg,txt}', 'licenses/*.{txt,json}', 'manifest.webmanifest', 'release.json', 'catalog/v1/LICENSE.txt', 'catalog/v1/PROVENANCE.json'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      manifestTransforms: [async entries => ({ manifest: await Promise.all(entries.map(async entry => ({ ...entry, revision: entry.url === 'release.json' ? JSON.parse(await readFile('dist/release.json', 'utf8')).buildId : entry.revision, integrity: integrity(await readFile(join('dist', entry.url))) }))), warnings: [] })],
      rollupFormat: 'iife',
    },
  })],
  base: process.env.TOADOKU_BASE ?? './',
  optimizeDeps: { entries: ['index.html'] },
  server: { watch: { ignored: ['**/prototypes/**'] } },
  build: {
    modulePreload: { resolveDependencies: (filename, deps, { hostType }) => hostType === 'js' ? deps.filter(dep => dep !== filename) : deps },
    license: { fileName: 'licenses/dependencies.json' },
  },
});
