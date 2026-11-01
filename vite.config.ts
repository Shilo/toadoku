import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { copyFile, mkdir } from 'node:fs/promises';

export default defineConfig({
  plugins: [svelte(), {
    name: 'font-notices',
    apply: 'build',
    async closeBundle() {
      await mkdir('dist/licenses', { recursive: true });
      await Promise.all(['Outfit-OFL.txt', 'Nunito-OFL.txt', 'Bitter-OFL.txt', 'Chewy-LICENSE.txt', 'Creepster-OFL.txt'].map(file => copyFile(`src/assets/fonts/${file}`, `dist/licenses/${file}`)));
    }
  }],
  base: './',
  // DEV001: ignored certification builds and mutation reports are not application entries.
  optimizeDeps: { entries: ['index.html'] },
  // Fixtures can still be served on demand; generated evidence never triggers application HMR.
  server: { watch: { ignored: ['**/prototypes/**'] } },
  build: {
    modulePreload: {
      // Native import owns its target; a failed self-preload can prevent WebKit recovery.
      resolveDependencies: (filename, deps, { hostType }) => hostType === 'js' ? deps.filter(dep => dep !== filename) : deps,
    },
    license: { fileName: 'licenses/dependencies.json' },
  }
});
