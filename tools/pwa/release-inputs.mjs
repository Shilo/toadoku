import { execFileSync } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SHA = /^[a-f0-9]{40}$/;
const ZERO = '0'.repeat(40);
const roots = new Set([
  'index.html', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json',
  '.gitattributes', '.npmrc', '.node-version', '.nvmrc',
  '.env', '.env.local', '.env.production', '.env.production.local',
  'vitest.config.ts', 'playwright.config.ts', 'tools/test.mjs',
  '.github/workflows/pages.yml',
  'tsconfig.json',
  ...['vite', 'svelte'].flatMap(name => ['js', 'ts', 'mjs', 'mts', 'cjs', 'cts'].map(extension => `${name}.config.${extension}`)),
]);
const directories = ['src', 'public', 'data', 'tools/pwa', 'tools/catalog'];
export const EXCLUDED = ['src/lib/scene/README.md'];
// Shared with commit-count versioning. Keep these paths stable: removing historical inputs can lower a version.
export const SHIPPED = [...roots, ...directories.map(path => `${path}/**`), 'tsconfig.*.json'];
export const releasePathspecs = () => [
  ...SHIPPED.map(path => `:(top,glob)${path}`),
  ...EXCLUDED.map(path => `:(top,exclude,literal)${path}`),
];

/** Update this policy when production starts reading a new input outside these paths. */
export function isReleaseInput(file) {
  if (EXCLUDED.includes(file)) return false;
  return roots.has(file) || directories.some(path => file.startsWith(`${path}/`)) || /^tsconfig\.[^/]*\.json$/.test(file);
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, timeout: 60000, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
function present(sha, cwd) {
  if (!SHA.test(sha)) return false;
  try { git(['cat-file', '-e', `${sha}^{commit}`], cwd); return true; } catch { return false; }
}
function requireSource(sha, cwd) {
  if (!present(sha, cwd)) throw new Error('Checked-out source commit is unavailable');
}
function decode(buffer) { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }

/** Compare the complete pushed snapshots, never the truncated event commits/path list. */
export function pushDecision(before, after, cwd = '.') {
  requireSource(after, cwd);
  if (before === ZERO) return { release: true, reason: 'First push of this branch' };
  if (!SHA.test(before ?? '')) return { release: true, reason: 'Push base unknown; conservatively validate and build' };
  if (!present(before, cwd)) {
    try { git(['fetch', '--no-tags', '--depth=1', '--filter=blob:none', 'origin', before], cwd); }
    catch { return { release: true, reason: 'Push base unavailable; conservatively validate and build' }; }
  }
  try {
    // Disabling rename detection retains both old/new paths, without fetching blobs for similarity.
    const paths = decode(git(['diff', '--name-only', '-z', '--no-renames', before, after, '--'], cwd)).split('\0').filter(Boolean);
    const count = paths.filter(isReleaseInput).length;
    return { release: count > 0, reason: count ? `${count} production input path(s) changed` : 'No production inputs changed' };
  } catch { return { release: true, reason: 'Complete diff unavailable; conservatively validate and build' }; }
}

export function eventDecision(eventName, event, sha, ref, cwd = '.') {
  if (ref !== 'refs/heads/main') return { release: false, reason: 'Only main may publish' };
  if (eventName === 'workflow_dispatch') {
    requireSource(sha, cwd);
    return { release: true, reason: 'Explicit manual release or initial setup' };
  }
  if (eventName !== 'push') throw new Error('Unexpected publication event');
  if (event.deleted) return { release: false, reason: 'Deleted branch cannot publish' };
  if (event.ref !== ref || event.after !== sha) throw new Error('Push identity differs from checked-out workflow source');
  return pushDecision(event.before, sha, cwd);
}

function inputTree(sha, cwd) {
  requireSource(sha, cwd);
  return decode(git(['ls-tree', '-r', '-z', '--full-tree', sha], cwd)).split('\0').filter(row => {
    const tab = row.indexOf('\t');
    if (tab < 0) { if (row) throw new Error('Invalid Git tree entry'); return false; }
    return isReleaseInput(row.slice(tab + 1));
  }).join('\0');
}

/** An older app commit may still publish through newer docs-only commits, but never newer app inputs. */
export function currentDecision(source, latest, cwd = '.') {
  return inputTree(source, cwd) === inputTree(latest, cwd)
    ? { release: true, reason: 'Source matches current main production inputs' }
    : { release: false, reason: 'Superseded by different production inputs on main; newer push owns publication' };
}

export function fetchCurrentDecision(source, cwd = '.') {
  try {
    // Release versioning requires the complete graph; --depth=1 would make a full checkout shallow.
    git(['fetch', '--no-tags', '--filter=blob:none', 'origin', '+refs/heads/main:refs/remotes/origin/toadoku-release-main'], cwd);
    const latest = decode(git(['rev-parse', '--verify', 'refs/remotes/origin/toadoku-release-main^{commit}'], cwd)).trim();
    return currentDecision(source, latest, cwd);
  } catch { throw new Error('Cannot verify current main production inputs; publication refused'); }
}

async function main() {
  const { GITHUB_EVENT_NAME: eventName, GITHUB_EVENT_PATH: eventPath, GITHUB_SHA: sha,
    GITHUB_REF: ref, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary } = process.env;
  if (!output || !SHA.test(sha ?? '')) throw new Error('GitHub source/output context required');
  const mode = process.argv[2];
  if (!['changed', 'current'].includes(mode)) throw new Error('Expected changed or current mode');
  let result;
  if (mode === 'changed') result = eventDecision(eventName, JSON.parse(await readFile(eventPath, 'utf8')), sha, ref);
  else {
    if (ref !== 'refs/heads/main') throw new Error('Only main may publish');
    result = fetchCurrentDecision(sha);
  }
  await appendFile(output, `release=${result.release}\n`);
  if (summary) await appendFile(summary, `### Pages ${mode} check\n\n${result.release ? 'Continue' : 'Skip production build/deploy'}: ${result.reason}.\n\nSource: \`${sha}\`.\n`);
  console.log(JSON.stringify(result));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
