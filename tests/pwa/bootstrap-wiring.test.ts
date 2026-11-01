import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { workflowHash } from '../../tools/pwa/bootstrap.mjs';
const execute = promisify(execFile), root = process.cwd();
const legacySource = "name: Toadoku Pages\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\npermissions:\n  contents: read\n  actions: read\n  pages: write\n  id-token: write\nconcurrency:\n  group: toadoku-pages\n  cancel-in-progress: false\njobs:\n  release:\n    runs-on: ubuntu-latest\n    environment:\n      name: github-pages\n      url: ${{ steps.deployment.outputs.page_url }}\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '24'\n          cache: npm\n      - id: pages\n        uses: actions/configure-pages@v5\n      - run: npm ci\n      - run: npm run check\n      - run: npm test -- --maxWorkers=2\n      - name: Build current complete offline closure\n        run: npm run build\n        env:\n          TOADOKU_BASE: ${{ steps.pages.outputs.base_path }}/\n      - run: node tools/pwa/validate.mjs dist\n      - name: Read monotonic retained publication archive\n        env:\n          GH_TOKEN: ${{ github.token }}\n        run: node tools/pwa/previous.mjs\n      - name: Expand validated archive path\n        shell: bash\n        run: |\n          if [ -f prototypes/pwa-validation/previous.zip ]; then\n            if unzip -Z1 prototypes/pwa-validation/previous.zip | grep -Eq '(^/|(^|/)\\.\\.(/|$))'; then exit 1; fi\n            unzip -q prototypes/pwa-validation/previous.zip -d prototypes/pwa-validation/previous\n          fi\n      - name: Retain supported assets and protect currently hosted release\n        run: node tools/pwa/retain.mjs dist prototypes/pwa-validation/previous prototypes/pwa-validation/retained-assets \"${{ steps.pages.outputs.base_url }}/\"\n      - name: Validate complete publication artifact after retention\n        run: node tools/pwa/validate.mjs dist\n      - name: Build compact complete rollback snapshot\n        run: node tools/pwa/snapshot.mjs dist prototypes/pwa-validation/rollback\n      - name: Check repository artifact capacity without removing anything\n        id: capacity\n        run: node tools/pwa/capacity.mjs prototypes/pwa-validation/retained-assets prototypes/pwa-validation/rollback dist\n        env:\n          GH_TOKEN: ${{ github.token }}\n          TOADOKU_ARTIFACT_BUDGET_MIB: ${{ vars.TOADOKU_ARTIFACT_BUDGET_MIB || '400' }}\n      - name: Stage retained asset archive\n        uses: actions/upload-artifact@v4\n        with:\n          name: toadoku-retained-assets\n          path: prototypes/pwa-validation/retained-assets\n          retention-days: 30\n      - uses: actions/upload-pages-artifact@v3\n        with:\n          path: dist\n      - id: deployment\n        uses: actions/deploy-pages@v4\n      - uses: actions/upload-artifact@v4\n        with:\n          name: toadoku-rollback-release\n          path: prototypes/pwa-validation/rollback\n          retention-days: 30\n      - name: Verify actual published bytes and response headers\n        run: node tools/pwa/verify-host.mjs \"${{ steps.deployment.outputs.page_url }}\" dist prototypes/pwa-validation/hosting.json\n      - uses: actions/upload-artifact@v4\n        if: always() && steps.capacity.outcome == 'success'\n        with:\n          name: toadoku-hosting-evidence\n          path: |\n            prototypes/pwa-validation/hosting.json\n            prototypes/pwa-validation/artifact-capacity.json\n          if-no-files-found: ignore\n";
const sha = 'a'.repeat(40), priorSha = 'b'.repeat(40), repository = 'Owner/Game', base = 'https://owner.github.io/game/';
const current = { id: 100, workflow_id: 5, head_sha: sha, head_branch: 'main', run_attempt: 1, status: 'in_progress', conclusion: null, path: '.github/workflows/pages.yml', repository: { full_name: repository } };
const prior = { ...current, id: 99, head_sha: priorSha, status: 'completed', conclusion: 'failure' };
const page = (key: string, values: unknown[]) => ({ total_count: values.length, [key]: values });
async function runPrevious(options: { assertion?: string; priorDeploy?: string; archive?: boolean; rerun?: boolean } = {}) {
  await mkdir('prototypes/pwa-validation', { recursive: true });
  const cwd = await mkdtemp(resolve('prototypes/pwa-validation/bootstrap-wiring-'));
  await mkdir(join(cwd, '.github/workflows'), { recursive: true });
  await writeFile(join(cwd, '.github/workflows/pages.yml'), await readFile('.github/workflows/pages.yml'));
  const run = options.rerun ? { ...current, run_attempt: 2 } : current;
  const old = options.rerun ? run : prior;
  const jobs = [{ id: 77, run_id: old.id, head_sha: old.head_sha, name: 'release', status: 'completed', conclusion: 'failure', steps: [
    { number: 1, name: 'Stage retained asset archive', status: 'completed', conclusion: options.archive ? 'success' : 'skipped' },
    { number: 2, name: options.rerun ? 'Deploy verified Pages artifact' : 'Run actions/deploy-pages@v4', status: 'completed', conclusion: options.priorDeploy ?? 'skipped' },
  ] }];
  const hasPrior = options.priorDeploy !== undefined || options.archive;
  const routes: Record<string, unknown> = {
    'actions/workflows/pages.yml/runs?per_page=100': page('workflow_runs', hasPrior && !options.rerun ? [run, prior] : [run]),
    'actions/workflows/pages.yml/runs?branch=main&status=completed&per_page=100': page('workflow_runs', hasPrior && !options.rerun ? [prior] : []),
    [`contents/.github/workflows/pages.yml?ref=${priorSha}`]: { type: 'file', path: '.github/workflows/pages.yml', encoding: 'base64', content: Buffer.from(legacySource).toString('base64'), size: Buffer.byteLength(legacySource) },
    [`actions/runs/${old.id}/attempts/1/jobs?per_page=100`]: page('jobs', jobs),
    'actions/runs/99/jobs?filter=all&per_page=100': page('jobs', jobs),
    'actions/runs/99/artifacts?per_page=100': page('artifacts', options.archive ? [{ id: 7, name: 'toadoku-retained-assets', expired: false, size_in_bytes: 15 }] : []),
  };
  await writeFile(join(cwd, 'routes.json'), JSON.stringify(routes));
  const preload = join(cwd, 'fetch-fixture.mjs');
  await writeFile(preload, `import { readFile, writeFile } from 'node:fs/promises';
const routes = JSON.parse(await readFile(new URL('./routes.json', import.meta.url), 'utf8')), calls = [];
globalThis.fetch = async (input, init) => {
 const url = new URL(input); calls.push(url.href); await writeFile(new URL('./calls.json', import.meta.url), JSON.stringify(calls));
 if (url.href === 'https://api.github.com/repos/Owner/Game/actions/artifacts/7/zip') return new Response(null, { status: 302, headers: { location: 'https://signed.example/archive' } });
 if (url.href === 'https://signed.example/archive') { if (init?.headers?.Authorization) throw Error('Token forwarded to signed host'); return new Response('archive-fixture'); }
 if (!url.href.startsWith('https://api.github.com/repos/Owner/Game/')) throw Error('Unexpected network host');
 const path = url.href.slice('https://api.github.com/repos/Owner/Game/'.length);
 if (!(path in routes)) throw Error('Unmatched fixture request: ' + path);
 return Response.json(routes[path]);
};`);
  await execute(process.execPath, ['--import', pathToFileURL(preload).href, join(root, 'tools/pwa/previous.mjs')], { cwd, env: {
    ...process.env, GH_TOKEN: 'fixture-read-token', GITHUB_REPOSITORY: repository, GITHUB_SHA: sha,
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ID: '100',
    GITHUB_RUN_ATTEMPT: options.rerun ? '2' : '1', TOADOKU_PAGES_BASE: base,
    TOADOKU_INITIAL_RELEASE: options.assertion ?? '',
  } });
  return { cwd, history: JSON.parse(await readFile(join(cwd, 'prototypes/pwa-validation/previous/history.json'), 'utf8')), calls: JSON.parse(await readFile(join(cwd, 'calls.json'), 'utf8')) as string[] };
}
it('actual previous helper defaults to no bootstrap and does not scan proof history without assertion', async () => {
  const f = await runPrevious(); expect(f.history.bootstrap).toBe(false);
  expect(f.calls).toHaveLength(1); expect(f.calls[0]).toContain('branch=main&status=completed');
});
it('actual previous helper accepts pristine and early failed first releases with exact scoped assertion', async () => {
  const assertion = `${repository}|${base}|${sha}`;
  expect((await runPrevious({ assertion })).history).toMatchObject({ bootstrap: true, assertion, identity: { repository, site: base, sha, runId: 100, attempt: 1 } });
  const f = await runPrevious({ assertion, priorDeploy: 'skipped' }); expect(f.history.bootstrap).toBe(true);
  expect(f.history.priorAttempts).toBe(1);
  expect(workflowHash(Buffer.from(legacySource))).toBe('b0b6ff33a973346600918f306a09b1fb58e150309c00d677ebbee28a875db7ad');
});
it('actual archive discovery retains a pre-deploy archive without mistaking it for publication', async () => {
  const f = await runPrevious({ assertion: `${repository}|${base}|${sha}`, archive: true });
  expect(f.history).toMatchObject({ bootstrap: true, archiveId: 7 });
  expect(await readFile(join(f.cwd, 'prototypes/pwa-validation/previous.zip'), 'utf8')).toBe('archive-fixture');
});
it('actual wiring refuses an earlier deployed rerun and malformed scoped assertion', async () => {
  const assertion = `${repository}|${base}|${sha}`;
  expect((await runPrevious({ assertion, rerun: true, priorDeploy: 'success' })).history.bootstrap).toBe(false);
  expect((await runPrevious({ assertion: `${repository}|https://different.example/|${sha}` })).history.bootstrap).toBe(false);
});
