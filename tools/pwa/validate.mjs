import { assertCachedShellBudget } from './build.ts';
import { validateCatalog } from './catalog-artifact.mjs';
import { OFFLINE_THEME_PACKS, SHARED_OFFLINE_FONTS, THEME_FONT_BUDGET, assertThemeFontInventory } from './theme-packs.ts';
import { createHash } from 'node:crypto';
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
const root = process.argv[2] ?? 'dist';
try { await access(join(root, '.pwa-failed')); throw new Error('Cannot certify a failed build'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const releaseBytes = await readFile(join(root, 'release.json'));
const release = JSON.parse(releaseBytes.toString('utf8'));
if (release.protocol !== 1 || !/^[a-f0-9]{64}$/.test(release.buildId)) throw new Error('Invalid release identity');
if (release.updateProtocol !== 2 || release.storageProtocol !== 1) throw new Error('Unsupported update/storage compatibility protocol');
if (release.themePacks || release.files.some(file => /\.woff2?$/.test(file.path))) {
  const policy = release.themePacks;
  const expectedThemes = Object.keys(OFFLINE_THEME_PACKS).sort();
  const expectedNotices = [...new Set(['Outfit-OFL.txt', ...Object.values(OFFLINE_THEME_PACKS).flatMap(pack => pack.notices)])].sort().map(file => `licenses/${file}`);
  if (policy?.version !== 1 || policy.fontBudget !== THEME_FONT_BUDGET || JSON.stringify(policy.themes) !== JSON.stringify(expectedThemes) || JSON.stringify(policy.notices) !== JSON.stringify(expectedNotices)) throw new Error('Unsupported offline theme policy');
  const sourceFonts = [...SHARED_OFFLINE_FONTS, ...Object.values(OFFLINE_THEME_PACKS).flatMap(pack => pack.fonts)];
  const declared = new Set(await Promise.all(sourceFonts.map(async file => createHash('sha256').update(await readFile(`src/assets/fonts/${file}`)).digest('hex'))));
  const fonts = release.files.filter(file => /\.(?:ttf|woff2?)$/.test(file.path)).map(({path,bytes,sha256}) => ({path,bytes,sha256}));
  assertThemeFontInventory(fonts, declared);
  if (JSON.stringify(policy.fonts) !== JSON.stringify(fonts) || expectedNotices.some(path => !release.files.some(file => file.path === path))) throw new Error('Incomplete offline theme closure');
}
const worker = await readFile(join(root, 'worker.js'), 'utf8');
const start = worker.search(/\[\{"(?:integrity|revision|url)":/);
if (start < 0) throw new Error('Actual injected inventory not found');
let depth = 0, quoted = false, escaped = false, end = -1;
for (let index = start; index < worker.length; index++) {
  const char = worker[index];
  if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; }
  else if (char === '"') quoted = true;
  else if (char === '[') depth++;
  else if (char === ']' && --depth === 0) { end = index + 1; break; }
}
if (end < 0) throw new Error('Incomplete injected inventory');
const rawEntries = JSON.parse(worker.slice(start, end)), injected = new Map();
for (const entry of rawEntries) {
  const prior = injected.get(entry.url);
  if (prior && (prior.revision !== entry.revision || prior.integrity && entry.integrity && prior.integrity !== entry.integrity)) throw new Error('Conflicting actual injected entries');
  injected.set(entry.url, { ...entry, integrity: entry.integrity || prior?.integrity });
}
const expectedURLs = new Set([...release.files.map(file => file.path), 'release.json']);
if (injected.size !== expectedURLs.size || [...injected.keys()].some(url => !expectedURLs.has(url))) throw new Error('Actual injected closure differs from current release');
for (const [path, entry] of injected) {
  const body = await readFile(join(root, path));
  if (entry.integrity !== `sha256-${createHash('sha256').update(body).digest('base64')}`) throw new Error(`Actual injected response has no matching integrity: ${path}`);
}
if (injected.get('release.json').revision !== release.buildId) throw new Error('Injected worker/document identity mismatch');
const all = async (dir, prefix = '') => (await Promise.all((await readdir(join(dir, prefix), { withFileTypes: true })).map(entry => entry.isDirectory() ? all(dir, `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]))).flat();
const actual = await all(root);
let retained;
try { retained = JSON.parse(await readFile(join(root, 'retention.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const extras = new Set();
if (retained) {
  if (retained.protocol !== 1 || !Array.isArray(retained.files) || retained.days !== 30 || retained.capBytes !== 256 * 1024 * 1024) throw new Error('Invalid retained artifact policy');
  let total = 0;
  for (const file of retained.files) {
    if (!/^assets\/[\w.-]+\.(?:js|css|ttf|woff2?|png|svg|webp)$/.test(file.path) || extras.has(file.path) || !Number.isFinite(file.lastCurrent) || Date.now() - file.lastCurrent > 30 * 86400_000 || file.lastCurrent > Date.now()) throw new Error('Invalid retained artifact path/age');
    const bytes = await readFile(join(root, file.path)); total += bytes.length;
    if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw new Error('Retained artifact integrity mismatch');
    extras.add(file.path);
  }
  if (total > retained.capBytes) throw new Error('Retained artifact budget exceeded');
}
const required = actual.filter(path => path === 'index.html' || path === 'manifest.webmanifest' || path.startsWith('assets/') || path.startsWith('pwa/') || path.startsWith('licenses/') || /^catalog\/v1\/(LICENSE.txt|PROVENANCE.json)$/.test(path));
if (release.files.some(file => !required.includes(file.path)) || required.some(path => !release.files.some(file => file.path === path) && !extras.has(path))) throw new Error('Offline inventory omitted an emitted dependency');
if (actual.some(path => /(?:\.map$|prototypes|fixtures|__dev|\.env)/.test(path))) throw new Error('Forbidden production artifact');
let bytes = 0;
for (const file of release.files) {
  if (!required.includes(file.path) || file.path.includes('..')) throw new Error('Unexpected precache resource');
  const body = await readFile(join(root, file.path)); bytes += body.length;
  if (body.length !== file.bytes || hash(body) !== file.sha256 || !worker.includes(file.integrity)) throw new Error(`Offline integrity/injection mismatch: ${file.path}`);
}
if (bytes !== release.bytes) throw new Error('Shell byte budget mismatch');
const shellBytes = assertCachedShellBudget(bytes, releaseBytes.byteLength);
const manifest = JSON.parse(await readFile(join(root, 'manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons ?? []) {
  if (!/^pwa\/[\w.-]+\.png$/.test(icon.src) || !actual.includes(icon.src)) throw new Error('Missing installation icon');
  const bytes = await readFile(join(root, icon.src));
  const size = Number(icon.sizes.split('x')[0]);
  if (bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size) throw new Error('Invalid installation icon dimensions');
}
if (manifest.id !== './' || manifest.start_url !== './' || manifest.scope !== './' || manifest.icons.length !== 3) throw new Error('Unstable installation identity');
const index = await readFile(join(root, 'index.html'), 'utf8');
if (!index.includes(`name="toadoku-build" content="${release.buildId}"`)) throw new Error('Document release identity mismatch');
if (worker.includes('catalog/v1/manifest.json') || /catalog\/v1\/[a-f0-9]{64}\.json/.test(worker)) throw new Error('Catalog puzzles were added to application precache');
const catalog = await validateCatalog(root);
console.log(JSON.stringify({ catalog, buildId: release.buildId, files: release.files.length, resourceBytes: bytes, shellBytes, workerSha256: hash(Buffer.from(worker)), workerBytes: Buffer.byteLength(worker) }, null, 2));
