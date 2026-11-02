import { expect, it, vi } from 'vitest';
import { previousArchive } from '../../tools/pwa/previous-history.mjs';

const repository = 'Owner/Game', now = Date.parse('2026-11-01T12:00:00Z');
const sha = 'a'.repeat(40), previousSha = 'b'.repeat(40);
const date = (offset: number) => new Date(now + offset * 1000).toISOString();
const page = (data: any, hasNext = false) => ({ data, hasNext });
const inventory = (artifacts: any[]) => page({ artifacts, total_count: artifacts.length });

function fixture() {
  const deployments: any[] = [], routes = new Map<string, any>();
  const read = vi.fn(async (path: string) => {
    if (path === 'deployments?environment=github-pages&per_page=100&page=1') return page(deployments);
    if (!routes.has(path)) throw Error('Unexpected history request: ' + path);
    return routes.get(path);
  });
  function publication(options: { runId?: number; attempt?: number; deploymentId?: number; jobId?: number; archiveId?: number; offset?: number; missing?: boolean; expired?: boolean } = {}) {
    const runId = options.runId ?? 99, attempt = options.attempt ?? 1, deploymentId = options.deploymentId ?? 800;
    const jobId = options.jobId ?? 900, offset = options.offset ?? -3600;
    const headSha = runId === 100 ? sha : previousSha;
    const url = `https://github.com/${repository}/actions/runs/${runId}/job/${jobId}`;
    const deployment = { id: deploymentId, environment: 'github-pages', ref: 'main', sha: headSha, created_at: date(offset - 20), updated_at: date(offset + 30) };
    const run = { id: runId, repository: { id: 10, full_name: repository }, head_branch: 'main', head_sha: headSha, path: '.github/workflows/pages.yml', event: 'push', run_attempt: attempt, status: 'completed', conclusion: 'failure' };
    const stage = { number: 1, name: 'Stage retained asset archive', status: 'completed', conclusion: 'success', started_at: date(offset), completed_at: date(offset + 2) };
    const job = { id: jobId, run_id: runId, run_attempt: attempt, head_sha: headSha, head_branch: 'main', name: 'release', html_url: url, status: 'completed', conclusion: 'failure', started_at: date(offset - 10), completed_at: date(offset + 20), steps: [stage, { number: 2, name: 'Verify actual published bytes and response headers', status: 'completed', conclusion: 'failure' }] };
    const artifact = { id: options.archiveId ?? 7, name: 'toadoku-retained-assets', expired: options.expired ?? false, size_in_bytes: 15, created_at: date(offset + 1), workflow_run: { id: runId, repository_id: 10, head_repository_id: 10, head_branch: 'main', head_sha: headSha } };
    deployments.push(deployment);
    routes.set(`deployments/${deploymentId}/statuses?per_page=100`, page([{ id: deploymentId * 2, log_url: url, created_at: date(offset + 30) }]));
    routes.set(`actions/jobs/${jobId}`, page(job));
    routes.set(`actions/runs/${runId}`, page(run));
    routes.set(`actions/runs/${runId}/artifacts?per_page=100`, inventory(options.missing ? [] : [artifact]));
    return { deployment, run, job, stage, artifact };
  }
  return { deployments, routes, read, publication, discover: (attempt = 1) => previousArchive({ repository, runId: 100, attempt, read, now }) };
}

it('does not inspect arbitrary change-check runs, even after more than 100 docs-only pushes', async () => {
  const f = fixture();
  // These are intentionally absent from the deployment index: skipped environment jobs create none.
  f.routes.set('actions/workflows/pages.yml/runs?per_page=100', page({ total_count: 151, workflow_runs: [] }, true));
  const old = f.publication();
  expect(await f.discover()).toEqual(old.artifact);
  expect(f.read.mock.calls.every(([path]) => !path.includes('/workflows/') && !path.includes('/jobs?'))).toBe(true);
});
it('retains a successful pre-deploy upload even when later deployment or hosting checks failed', async () => {
  const f = fixture(), old = f.publication();
  expect(old.job.conclusion).toBe('failure');
  expect(await f.discover()).toEqual(old.artifact);
});
it('chooses actual newest upload time independently of metadata listing order', async () => {
  const f = fixture();
  const older = f.publication({ runId: 90, deploymentId: 801, jobId: 901, archiveId: 8, offset: -7200 });
  const newer = f.publication({ runId: 91, deploymentId: 802, jobId: 902, archiveId: 9, offset: -1800 });
  f.deployments.reverse();
  expect(await f.discover()).toEqual(newer.artifact);
  expect(f.read.mock.calls).toContainEqual([`actions/runs/${older.run.id}/artifacts?per_page=100`]);
});
it('refuses a newer successful upload whose archive is missing or expired', async () => {
  for (const patch of [{ missing: true }, { expired: true }]) {
    const f = fixture(); f.publication();
    f.publication({ runId: 91, deploymentId: 801, jobId: 901, archiveId: 8, offset: -1800, ...patch });
    await expect(f.discover()).rejects.toThrow('recent uploaded archive');
  }
});
it('does not let a previous attempt artifact conceal a newer missing upload on the same run', async () => {
  const f = fixture(), prior = f.publication({ runId: 99, attempt: 1, offset: -7200 });
  f.publication({ runId: 99, attempt: 2, deploymentId: 801, jobId: 901, offset: -1800, missing: true });
  f.routes.set('actions/runs/99/artifacts?per_page=100', inventory([prior.artifact]));
  await expect(f.discover()).rejects.toThrow('recent uploaded archive');
});
it('excludes only the current exact attempt while retaining an archive from an earlier rerun attempt', async () => {
  const f = fixture(), prior = f.publication({ runId: 100, attempt: 1, offset: -7200 });
  const current = f.publication({ runId: 100, attempt: 2, deploymentId: 801, jobId: 901, offset: -1800, missing: true });
  Object.assign(current.run, { status: 'in_progress', conclusion: null });
  Object.assign(current.job, { status: 'in_progress', conclusion: null, completed_at: null });
  f.routes.set('actions/runs/100/artifacts?per_page=100', inventory([prior.artifact]));
  expect(await f.discover(2)).toEqual(prior.artifact);
});
it('ignores clearly queued jobs with no steps, and refuses another started publication', async () => {
  const f = fixture(), queued = f.publication({ runId: 101 });
  Object.assign(queued.job, { status: 'queued', conclusion: null, started_at: null, completed_at: null, steps: [] });
  Object.assign(queued.run, { status: 'queued', conclusion: null });
  expect(await f.discover()).toBeUndefined();
  queued.job.status = 'in_progress'; queued.job.started_at = date(-3600);
  queued.run.status = 'in_progress';
  await expect(f.discover()).rejects.toThrow('uncertain progress');
});
it('does not fetch old expired jobs, but completes unsorted deployment metadata pagination', async () => {
  const f = fixture(), old = f.publication({ offset: -32 * 86400 });
  const recent = f.publication({ runId: 91, deploymentId: 801, jobId: 901, archiveId: 8 });
  f.deployments.pop();
  const realRead = f.read;
  const read = async (path: string) => path.endsWith('page=1') && path.startsWith('deployments?')
    ? page([old.deployment], true)
    : path.endsWith('page=2') && path.startsWith('deployments?') ? page([recent.deployment]) : realRead(path);
  expect(await previousArchive({ repository, runId: 100, attempt: 1, read, now })).toEqual(recent.artifact);
  expect(f.read.mock.calls.some(([path]) => path.includes(`/deployments/${old.deployment.id}/`))).toBe(false);
});
it('after a long release pause leaves current-host protection to the existing retain stage', async () => {
  const f = fixture(), old = f.publication({ offset: -32 * 86400, expired: true });
  old.deployment.ref = 'obsolete-feature'; old.deployment.sha = 'unknown-old-source';
  old.run.path = '.github/workflows/obsolete.yml';
  expect(await f.discover()).toBeUndefined();
  expect(f.read).toHaveBeenCalledTimes(1);
});
it('allows a recent failed-before-upload job without demanding an artifact', async () => {
  const f = fixture(), failed = f.publication({ missing: true });
  failed.stage.conclusion = 'skipped';
  failed.job.steps.push({ number: 3, name: 'Deploy verified Pages artifact', status: 'completed', conclusion: 'skipped' });
  expect(await f.discover()).toBeUndefined();
  expect(f.read.mock.calls.some(([path]) => path.includes('/artifacts?'))).toBe(false);
});
it('refuses attempted deployment or unknown deploy shape without a successful retained upload', async () => {
  for (const outcome of ['success', 'failure', 'cancelled', 'unknown-shape']) {
    const f = fixture(), failed = f.publication({ missing: true }); failed.stage.conclusion = 'skipped';
    failed.job.steps.push({ number: 3, name: outcome === 'unknown-shape' ? 'Unrecognized deploy action' : 'Deploy verified Pages artifact', status: 'completed', conclusion: outcome === 'unknown-shape' ? 'skipped' : outcome });
    await expect(f.discover()).rejects.toThrow('Deployment was attempted');
  }
});
it('refuses missing or foreign job links, unknown workflow/ref/source and invalid timestamps', async () => {
  const cases = [
    (f: ReturnType<typeof fixture>, p: any) => f.routes.set(`deployments/${p.deployment.id}/statuses?per_page=100`, page([{ id: 1, created_at: date(-3500) }])),
    (f: ReturnType<typeof fixture>, p: any) => f.routes.set(`deployments/${p.deployment.id}/statuses?per_page=100`, page([{ id: 1, created_at: date(-3500), log_url: 'https://evil.example/Owner/Game/actions/runs/99/job/900' }])),
    (_: any, p: any) => p.run.path = '.github/workflows/unknown.yml',
    (_: any, p: any) => p.deployment.ref = 'feature',
    (_: any, p: any) => p.job.head_sha = sha,
    (_: any, p: any) => p.artifact.workflow_run.id = 123,
    (_: any, p: any) => p.deployment.updated_at = 'invalid',
    (_: any, p: any) => p.deployment.updated_at = '2026-02-31T12:00:00Z',
    (_: any, p: any) => p.stage.started_at = date(1000),
    (_: any, p: any) => p.job.steps[1].conclusion = 'unknown',
  ];
  for (const patch of cases) {
    const f = fixture(), p = f.publication(); patch(f, p);
    await expect(f.discover()).rejects.toThrow();
  }
});
it('refuses truncated statuses or artifact inventories, duplicate records, and incomplete metadata pages', async () => {
  for (const kind of ['statuses', 'artifacts', 'duplicate', 'empty-page']) {
    const f = fixture(), p = f.publication();
    if (kind === 'statuses') f.routes.get(`deployments/${p.deployment.id}/statuses?per_page=100`).hasNext = true;
    if (kind === 'artifacts') f.routes.get('actions/runs/99/artifacts?per_page=100').hasNext = true;
    if (kind === 'duplicate') f.deployments.push(p.deployment);
    if (kind === 'empty-page') {
      const read = async () => page([], true);
      await expect(previousArchive({ repository, runId: 100, attempt: 1, read, now })).rejects.toThrow(); continue;
    }
    await expect(f.discover()).rejects.toThrow();
  }
});
