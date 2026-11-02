import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { expect, it } from 'vitest';
import { isReleaseInput, pushDecision, eventDecision, currentDecision, fetchCurrentDecision } from '../../tools/pwa/release-inputs.mjs';

const root = resolve('.'), script = join(root, 'tools/pwa/release-inputs.mjs');
function repository() {
  mkdirSync('prototypes/pwa-validation', { recursive: true });
  const cwd = mkdtempSync(resolve('prototypes/pwa-validation/release-git-'));
  const git = (args: string[], input?: string) => execFileSync('git', args, { cwd, input, encoding: 'utf8', stdio: ['pipe','pipe','pipe'], timeout: 15000 }).trim();
  git(['init', '--initial-branch=main']);
  const hashes = new Map<string, string>();
  const blob = (body: string) => {
    if (!hashes.has(body)) hashes.set(body, git(['hash-object','-w','--stdin'], body));
    return hashes.get(body)!;
  };
  function commit(paths: Record<string, string | null>) {
    const rows = Object.entries(paths).map(([file, body]) => body === null
      ? `0 ${'0'.repeat(40)}\t${file}\0`
      : `100644 ${blob(body)}\t${file}\0`).join('');
    git(['update-index','-z','--index-info'], rows);
    git(['-c','user.name=CI fixture','-c','user.email=ci@example.invalid','commit','--allow-empty','-qm','Fixture']);
    return git(['rev-parse','HEAD']);
  }
  const first = commit({ 'src/App.svelte': 'app one', 'README.md': 'readme one' });
  return { cwd, git, commit, first };
}

it.each([
  'src/App.svelte', 'src/lib/pwa/worker.ts', 'src/assets/font.woff2', 'src/help.md',
  'public/catalog/v1/puzzles.json', 'public/pwa/icon.svg', 'public/help.md', 'public/CNAME',
  'data/gameplay-policy.v2.json', 'data/techniques.v1.json', 'data/catalog/certificate.v1.json',
  'tools/catalog/verify.ts', 'tools/pwa/release-inputs.mjs', 'tools/test.mjs',
  'index.html','package.json','package-lock.json','npm-shrinkwrap.json','.npmrc','.gitattributes','.node-version','.nvmrc',
  '.env','.env.local','.env.production','.env.production.local',
  'vite.config.ts','vite.config.mts','svelte.config.js','tsconfig.json','tsconfig.node.json',
  'vitest.config.ts','playwright.config.ts','.github/workflows/pages.yml',
])('includes production or release input %s', file => expect(isReleaseInput(file)).toBe(true));
it.each([
  'README.md','AGENTS.md','CLAUDE.md','TODO.md','docs/pwa-system.md', 'docs/icon.png',
  'tests/pwa/release-inputs.test.ts','prototypes/demo/src/App.svelte','.agents/skills/svelte/SKILL.md',
  'src/lib/scene/README.md','.github/ISSUE_TEMPLATE/bug.md','.github/workflows/unrelated.yml',
  '.env.example','.env.development','tools/theme-font-assets.py',
])('excludes non-production input %s', file => expect(isReleaseInput(file)).toBe(false));

it('handles a multi-commit push, deletions and app-to-docs renames using both paths', () => {
  const r = repository();
  const docs = r.commit({ 'docs/how.md': 'docs' });
  expect(pushDecision(r.first, docs, r.cwd).release).toBe(false);
  r.commit({ 'src/new.ts': 'new code' });
  const latest = r.commit({ 'docs/how.md': 'more docs' });
  expect(pushDecision(docs, latest, r.cwd).release).toBe(true);
  const moved = r.commit({ 'src/new.ts': null, 'docs/new.ts': 'new code' });
  expect(pushDecision(latest, moved, r.cwd).release).toBe(true);
  expect(pushDecision(moved, moved, r.cwd).release).toBe(false);
});
it('reads all paths beyond GitHub native filtering limits and preserves newline paths', () => {
  const r = repository(), many: Record<string, string> = {};
  for (let i = 0; i < 3100; i++) many[`docs/${i}.md`] = 'same documentation';
  many['src/last.ts'] = 'app code'; many['docs/name\nwith-newline.md'] = 'docs';
  const latest = r.commit(many);
  expect(pushDecision(r.first, latest, r.cwd)).toMatchObject({ release: true, reason: '1 production input path(s) changed' });
}, 20000);
it('initial and unavailable bases build conservatively, while invalid source/event identity refuses', () => {
  const r = repository();
  expect(pushDecision('0'.repeat(40), r.first, r.cwd).release).toBe(true);
  expect(pushDecision(undefined, r.first, r.cwd).release).toBe(true);
  expect(pushDecision('f'.repeat(40), r.first, r.cwd).release).toBe(true);
  expect(() => pushDecision(r.first, 'bad', r.cwd)).toThrow();
  expect(() => eventDecision('push', { before: r.first, after: 'f'.repeat(40), ref: 'refs/heads/main' }, r.first, 'refs/heads/main', r.cwd)).toThrow();
  expect(eventDecision('workflow_dispatch', {}, r.first, 'refs/heads/main', r.cwd).release).toBe(true);
  expect(eventDecision('push', {}, r.first, 'refs/heads/feature', r.cwd).release).toBe(false);
});
it('compares snapshots on a force push without requiring a common ancestor', () => {
  const r = repository(), a = r.first;
  r.git(['checkout','--orphan','replacement']); r.git(['read-tree','--empty']);
  const b = r.commit({ 'public/new.svg': 'new app', 'README.md': 'replacement' });
  expect(pushDecision(a, b, r.cwd).release).toBe(true);
});
it('allows docs-only descendants but rejects older different app trees and mode changes', () => {
  const r = repository(), a = r.first;
  const b = r.commit({ 'docs/readme.md': 'docs' });
  expect(currentDecision(a, b, r.cwd).release).toBe(true);
  const c = r.commit({ 'src/App.svelte': 'new app' });
  expect(currentDecision(a, c, r.cwd).release).toBe(false);
  expect(currentDecision(c, c, r.cwd).release).toBe(true);
  const blob = r.git(['rev-parse',`${c}:src/App.svelte`]);
  r.git(['update-index','--cacheinfo',`100755,${blob},src/App.svelte`]);
  const d = r.commit({});
  expect(currentDecision(c, d, r.cwd).release).toBe(false);
});
it('actual CLI fetches current main and emits a boolean without rebuilding or publishing', () => {
  const r = repository();
  const docs = r.commit({ 'docs/readme.md': 'docs' });
  const remote = join(r.cwd,'remote.git'); r.git(['clone','--bare','.',remote]);
  r.git(['remote','add','origin',remote]);
  expect(fetchCurrentDecision(r.first, r.cwd).release).toBe(true);
  const app = r.commit({ 'src/App.svelte': 'new app' }); r.git(['push','origin','main']);
  expect(fetchCurrentDecision(r.first, r.cwd).release).toBe(false);
  const event = join(r.cwd,'event.json'), output = join(r.cwd,'output.txt'), summary = join(r.cwd,'summary.md');
  writeFileSync(event, JSON.stringify({ before: r.first, after: docs, ref: 'refs/heads/main' }));
  execFileSync(process.execPath,[script,'changed'],{cwd:r.cwd,env:{...process.env,GITHUB_EVENT_NAME:'push',GITHUB_EVENT_PATH:event,GITHUB_SHA:docs,GITHUB_REF:'refs/heads/main',GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:summary}});
  expect(readFileSync(output,'utf8')).toBe('release=false\n');
  expect(readFileSync(summary,'utf8')).toContain('No production inputs changed');
  writeFileSync(output,'');
  execFileSync(process.execPath,[script,'current'],{cwd:r.cwd,env:{...process.env,GITHUB_SHA:r.first,GITHUB_REF:'refs/heads/main',GITHUB_OUTPUT:output}});
  expect(readFileSync(output,'utf8')).toBe('release=false\n');
  r.git(['remote','set-url','origin',join(r.cwd,'missing.git')]);
  expect(() => fetchCurrentDecision(app, r.cwd)).toThrow('publication refused');
});
