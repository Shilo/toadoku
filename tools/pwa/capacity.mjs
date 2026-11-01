import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';
export const DEFAULT_ARTIFACT_BUDGET = 400 * 1024 * 1024;
/** Read-only capacity refusal. This never removes artifacts or changes account limits. */
export async function checkArtifactCapacity(api, plannedBytes, budgetBytes = DEFAULT_ARTIFACT_BUDGET) {
  if (!Number.isSafeInteger(plannedBytes) || plannedBytes < 0 || !Number.isSafeInteger(budgetBytes) || budgetBytes < 1) throw new Error('Invalid artifact capacity budget');
  let usedBytes = 0, seen = 0, expected;
  for (let page = 1; page <= 10; page++) {
    const result = await api(`actions/artifacts?per_page=100&page=${page}`);
    if (!Number.isSafeInteger(result.total_count) || result.total_count < 0 || result.total_count > 1000 || !Array.isArray(result.artifacts) || result.artifacts.length > 100) throw new Error('Artifact inventory cannot be bounded; publication refused');
    if (expected === undefined) expected = result.total_count;
    if (expected !== result.total_count) throw new Error('Artifact inventory changed; publication refused');
    for (const artifact of result.artifacts) {
      if (!Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes < 0 || typeof artifact.expired !== 'boolean') throw new Error('Invalid artifact capacity metadata');
      if (!artifact.expired) usedBytes += artifact.size_in_bytes;
      if (!Number.isSafeInteger(usedBytes)) throw new Error('Artifact capacity overflow');
    }
    seen += result.artifacts.length;
    if (seen >= expected) {
      const projectedBytes = usedBytes + plannedBytes;
      const result = { budgetBytes, usedBytes, plannedBytes, projectedBytes, withinBudget: Number.isSafeInteger(projectedBytes) && projectedBytes <= budgetBytes, accountQuotaVerified: false };
      if (!result.withinBudget) throw Object.assign(new Error('Repository artifact capacity limit reached. Publication needs manual artifact management or a reviewed capacity change.'), { capacity: result });
      return result;
    }
    if (!result.artifacts.length) throw new Error('Incomplete artifact inventory; publication refused');
  }
  throw new Error('Artifact inventory exceeds bounded scan; publication refused');
}
export function estimatedUploadBytes(inventories) {
  if (!Array.isArray(inventories) || inventories.length !== 3) throw new Error('Three upload inventories required');
  let result = 128 * 1024 + 1024 * 1024;
  inventories.forEach((value, index) => {
    if (['bytes','files','pathBytes','paddedBytes'].some(key => !Number.isSafeInteger(value[key]) || value[key] < 0)) throw new Error('Invalid upload inventory');
    // ZIP compression may expand. Pages additionally wraps every file in padded TAR records.
    const body = index === 2 ? value.paddedBytes + value.files * 2048 + value.pathBytes * 2 + 10240 : value.bytes;
    result += Math.ceil(body * 1.01) + value.files * 2048 + value.pathBytes * 2 + 1024 * 1024;
  });
  if (!Number.isSafeInteger(result)) throw new Error('Upload capacity overflow');
  return result;
}
async function directoryInventory(directory, prefix = '') {
  const result = { bytes: 0, files: 0, pathBytes: 0, paddedBytes: 0 };
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) { const nested = await directoryInventory(directory, path); for (const key of Object.keys(result)) result[key] += nested[key]; }
    else { const size = (await stat(join(directory, path))).size; result.bytes += size; result.files++; result.pathBytes += Buffer.byteLength(path); result.paddedBytes += Math.ceil(size / 512) * 512; }
  }
  return result;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const repository = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !token) throw new Error('GitHub read-only workflow credentials required');
  const folders = process.argv.slice(2);
  if (folders.length !== 3) throw new Error('Provide retained archive, compact rollback and Pages artifact directories');
  // Compression is not assumed. Include ZIP/tar metadata and a bounded hosting evidence report.
  const plannedBytes = estimatedUploadBytes(await Promise.all(folders.map(folder => directoryInventory(folder))));
  const budget = Number(process.env.TOADOKU_ARTIFACT_BUDGET_MIB ?? 400) * 1024 * 1024;
  const api = async path => {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, { redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`Read-only artifact capacity check failed: HTTP ${response.status}`);
    return response.json();
  };
  let report;
  try { report = await checkArtifactCapacity(api, plannedBytes, budget); }
  catch (error) { report = error.capacity; if (report) { await mkdir('prototypes/pwa-validation', { recursive: true }); await writeFile('prototypes/pwa-validation/artifact-capacity.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); } throw error; }
  await mkdir('prototypes/pwa-validation', { recursive: true }); await writeFile('prototypes/pwa-validation/artifact-capacity.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
