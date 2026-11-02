import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { appVersion, formatVersion } from '../../tools/pwa/version';
import { fetchCurrentDecision, isReleaseInput, releasePathspecs, SHIPPED } from '../../tools/pwa/release-inputs.mjs';

function fixture() {
  mkdirSync('prototypes/pwa-validation', { recursive: true });
  const cwd = mkdtempSync(resolve('prototypes/pwa-validation/version-git-'));
  const git = (args: string[], input?: string) => execFileSync('git', [
    '-c', 'user.name=Version fixture', '-c', 'user.email=version@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=no-hooks', ...args,
  ], { cwd, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 }).trim();
  git(['init', '-q', '-b', 'main']);
  function commit(paths: Record<string, string | null>) {
    const rows = Object.entries(paths).map(([path, body]) => body === null ? `0 ${'0'.repeat(40)}\t${path}\0`
      : `100644 ${git(['hash-object', '-w', '--stdin'], body)}\t${path}\0`).join('');
    git(['update-index', '-z', '--index-info'], rows);
    git(['commit', '--allow-empty', '-qm', 'Fixture']);
    return git(['rev-parse', 'HEAD']);
  }
  return { cwd, git, commit };
}

it('uses PixelDoll exact count packing, including all rollover boundaries', () => {
  expect([1, 99, 100, 149, 999, 1000, 1234, 2000, 12345].map(formatVersion))
    .toEqual(['0.0.1', '0.0.99', '0.1.0', '0.1.49', '0.9.99', '1.0.0', '1.2.34', '2.0.0', '12.3.45']);
});
it('counts only relevant commits, including removals, with the exact source commit separately', () => {
  const r = fixture(); r.commit({ 'docs/readme.md': 'docs' });
  expect(() => appVersion(r.cwd)).toThrow('no commits touch');
  r.commit({ 'src/app.ts': 'app' });
  r.commit({ 'docs/readme.md': 'more docs', 'tests/pwa/example.ts': 'test' });
  expect(appVersion(r.cwd)).toEqual({ version: '0.0.1', commit: r.git(['rev-parse', '--short=7', 'HEAD']) });
  r.commit({ '.github/workflows/pages.yml': 'workflow', 'public/icon.svg': 'icon' });
  r.commit({ 'src/app.ts': null, 'docs/moved.ts': 'app' });
  expect(appVersion(r.cwd).version).toBe('0.0.3');
});
it('walks both merge parents without counting the merge or a docs-only branch', () => {
  const r = fixture(); r.commit({ 'src/a.ts': '1' });
  r.commit({ 'docs/a.md': 'docs' }); r.commit({ 'src/a.ts': '2' }); r.commit({ 'src/a.ts': '3' });
  r.git(['checkout', '-qf', '-b', 'side', 'HEAD~3']);
  r.commit({ 'src/a.ts': '3' }); r.commit({ 'src/b.ts': 'b' });
  r.git(['checkout', '-qf', 'main']); r.git(['merge', '-q', '--no-ff', '-m', 'Merge side', 'side']);
  expect(appVersion(r.cwd)).toEqual({ version: '0.0.5', commit: r.git(['rev-parse', '--short=7', 'HEAD']) });
  r.git(['checkout', '-qf', '-b', 'docs']); r.commit({ 'docs/branch.md': 'docs' });
  r.git(['checkout', '-qf', 'main']); r.git(['merge', '-q', '--no-ff', '-m', 'Merge docs', 'docs']);
  expect(appVersion(r.cwd).version).toBe('0.0.5');
});
it('selects the same production paths for Git version history and push gating, including hidden paths', () => {
  const r = fixture(), paths = [...SHIPPED.filter(path => !path.includes('*')),
    'src/lib/app.ts', 'src/.hidden', 'src/name\nline.ts', 'src/lib/scene/README.md', 'public/help.md',
    'data/policy.json', 'tools/pwa/version.ts', 'tools/catalog/verify.ts', 'tsconfig.node.json', 'tsconfig.a b.json',
    'tsconfig.foo/bar.json', 'docs/how.md', 'README.md', 'tests/app.ts', '.env.example', '.env.development',
    'tools/other.mjs', 'vite.config.ts.bak', '.github/workflows/other.yml'];
  r.commit(Object.fromEntries(paths.map(path => [path, 'fixture'])));
  const tracked = r.git(['ls-files', '-z']).split('\0').filter(Boolean);
  // Git for Windows refuses newline filenames even with virtual index entries. Linux CI checks that path too.
  expect(tracked.sort()).toEqual(paths.filter(path => process.platform !== 'win32' || !path.includes('\n')).sort());
  expect(isReleaseInput('src/name\nline.ts')).toBe(true);
  const selected = r.git(['ls-files', '-z', '--', ...releasePathspecs()]).split('\0').filter(Boolean).sort();
  expect(selected).toEqual(tracked.filter(isReleaseInput).sort());
});
it('rejects a shallow checkout instead of shipping a misleading version', () => {
  const r = fixture(); r.commit({ 'src/a.ts': '1' }); r.commit({ 'src/a.ts': '2' });
  const shallow = join(r.cwd, 'shallow');
  r.git(['clone', '-q', '--depth=1', pathToFileURL(r.cwd).href, shallow]);
  expect(() => appVersion(shallow)).toThrow('full git history needed');
});
it('keeps complete version history after the real current-main freshness fetch', () => {
  const r = fixture(); r.commit({ 'src/a.ts': '1' }); r.commit({ 'src/a.ts': '2' });
  const source = r.git(['rev-parse', 'HEAD']), remote = join(r.cwd, 'remote.git');
  r.git(['clone', '-q', '--bare', '.', remote]); r.git(['remote', 'add', 'origin', remote]);
  expect(fetchCurrentDecision(source, r.cwd).release).toBe(true);
  expect(r.git(['rev-parse', '--is-shallow-repository'])).toBe('false');
  expect(appVersion(r.cwd).version).toBe('0.0.2');
});
