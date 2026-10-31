import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { copyFile, mkdir } from 'node:fs/promises';

export default defineConfig({
  plugins: [svelte(), {
    name: 'font-notices',
    apply: 'build',
    async closeBundle() {
      await mkdir('dist/licenses', { recursive: true });
      await Promise.all(['Outfit-OFL.txt', 'Chewy-LICENSE.txt'].map(file => copyFile(`src/assets/fonts/${file}`, `dist/licenses/${file}`)));
    }
  }],
  base: './',
  build: { license: { fileName: 'licenses/dependencies.json' } }
});
