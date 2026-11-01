import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { validateCatalog } from '../../tools/pwa/catalog-artifact.mjs';
it('accepts exact published bytes under unchanged certification inputs without resolving every puzzle again', async () => {
  const result = await validateCatalog('public');
  expect(result).toMatchObject({ puzzles: 100000, shards: 488, shardBytes: 32441127, certificationReused: true });
});
it('refuses an omitted shard although application-shell files are complete', async () => {
  const manifest = JSON.parse(await readFile('public/catalog/v1/manifest.json', 'utf8'));
  const missing = join('public/catalog/v1', manifest.pools.easy.shards[0].path);
  const reader: typeof readFile = ((path: unknown, ...args: unknown[]) => String(path) === missing ? Promise.reject(new Error('injected missing shard')) : (readFile as (...args: unknown[]) => Promise<unknown>)(path, ...args)) as typeof readFile;
  await expect(validateCatalog('public', reader)).rejects.toThrow('injected missing shard');
});
it('refuses a same-sized corrupt shard and a changed certified loader dependency', async () => {
  const manifest = JSON.parse(await readFile('public/catalog/v1/manifest.json', 'utf8'));
  const corrupt = join('public/catalog/v1', manifest.pools.easy.shards[0].path);
  for (const target of [corrupt, join('src/lib/catalog', 'attestation.ts')]) {
    const reader = async (path: string) => { const body = await readFile(path); if (path === target) { body[0] ^= 1; } return body; };
    await expect(validateCatalog('public', reader as typeof readFile)).rejects.toThrow();
  }
});
