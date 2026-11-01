import { expect, it, vi } from 'vitest';
import { checkArtifactCapacity, estimatedUploadBytes } from '../../tools/pwa/capacity.mjs';
it('counts unrelated repository artifacts without changing or removing them', async () => {
  const api = vi.fn().mockResolvedValue({ total_count: 3, artifacts: [{ size_in_bytes: 100, expired: false }, { size_in_bytes: 200, expired: false }, { size_in_bytes: 1000, expired: true }] });
  expect(await checkArtifactCapacity(api, 50, 400)).toMatchObject({ usedBytes: 300, projectedBytes: 350, withinBudget: true, accountQuotaVerified: false });
  expect(api.mock.calls).toEqual([['actions/artifacts?per_page=100&page=1']]);
});
it('refuses uploads at capacity and refuses incomplete or changing inventories', async () => {
  const api = vi.fn().mockResolvedValue({ total_count: 1, artifacts: [{ size_in_bytes: 350, expired: false }] });
  await expect(checkArtifactCapacity(api, 51, 400)).rejects.toThrow('capacity limit');
  for (const result of [{ total_count: 1001, artifacts: [] }, { total_count: 1, artifacts: [] }, { total_count: 1, artifacts: [{ size_in_bytes: -1, expired: false }] }]) await expect(checkArtifactCapacity(async () => result, 1)).rejects.toThrow();
  const changing = vi.fn().mockResolvedValueOnce({ total_count: 2, artifacts: [{ size_in_bytes: 1, expired: false }] }).mockResolvedValueOnce({ total_count: 3, artifacts: [{ size_in_bytes: 1, expired: false }] });
  await expect(checkArtifactCapacity(changing, 1)).rejects.toThrow('changed');
});
it('paginates read-only metadata and reserves tar, zip and per-file overhead without assuming compression', async () => {
  const api = vi.fn().mockResolvedValueOnce({ total_count: 2, artifacts: [{ size_in_bytes: 1, expired: false }] }).mockResolvedValueOnce({ total_count: 2, artifacts: [{ size_in_bytes: 2, expired: false }] });
  expect((await checkArtifactCapacity(api, 4, 100)).projectedBytes).toBe(7);
  const tinyFiles = { bytes: 1000, files: 1000, pathBytes: 10000, paddedBytes: 512000 };
  expect(estimatedUploadBytes([tinyFiles, tinyFiles, tinyFiles])).toBeGreaterThan(8 * 1024 * 1024);
  expect(() => estimatedUploadBytes([tinyFiles])).toThrow();
  expect(() => estimatedUploadBytes([{ ...tinyFiles, bytes: -1 }, tinyFiles, tinyFiles])).toThrow();
});
