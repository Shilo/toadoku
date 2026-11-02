import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { initialReleaseProof, workflowHash, type BootstrapContext } from '../../tools/pwa/bootstrap.mjs';
const source = readFileSync('.github/workflows/pages.yml');
const sha = 'a'.repeat(40), otherSha = 'b'.repeat(40), repository = 'Owner/Game', base = 'https://owner.github.io/game/';
const current = { id: 100, workflow_id: 5, head_sha: sha, head_branch: 'main', run_attempt: 1, status: 'in_progress', conclusion: null, path: '.github/workflows/pages.yml', repository: { full_name: repository } };
const prior = { ...current, id: 99, head_sha: otherSha, status: 'completed', conclusion: 'failure' };
const job = (run: Pick<typeof prior, 'id' | 'head_sha'> = prior, conclusion = 'skipped') => ({ id: 42, run_id: run.id, head_sha: run.head_sha, name: 'release', status: 'completed', conclusion: 'failure', steps: [{ number: 1, name: 'Build current complete offline closure', status: 'completed', conclusion: 'failure' }, { number: 2, name: 'Deploy verified Pages artifact', status: 'completed', conclusion }] });
const gate = (run: Pick<typeof prior, 'id' | 'head_sha'> = prior, conclusion = 'success') => ({ id: 43, run_id: run.id, head_sha: run.head_sha, name: 'changes', status: 'completed', conclusion, steps: [] });
const page = (key: string, values: any[]) => ({ data: { total_count: values.length, [key]: values }, hasNext: false });
function fixture(runs: any[] = [current], jobs: any[] = [gate(), job()]) {
  const read = vi.fn(async (path: string) => {
    if (path === 'actions/workflows/pages.yml/runs?per_page=100') return page('workflow_runs', runs);
    if (path === `contents/.github/workflows/pages.yml?ref=${otherSha}`) return { data: { type: 'file', path: '.github/workflows/pages.yml', encoding: 'base64', content: source.toString('base64'), size: source.length }, hasNext: false };
    if (/^actions\/runs\/\d+\/attempts\/\d+\/jobs\?per_page=100$/.test(path)) return page('jobs', jobs);
    throw Error('Unexpected fixture read: ' + path);
  });
  const context: BootstrapContext = { assertion: `${repository}|${base}|${sha}`, repository, base, sha, event: 'workflow_dispatch', ref: 'refs/heads/main', runId: 100, attempt: 1, source, read };
  return { context, read };
}
it('requires a scoped manual pristine assertion even when no previous runs exist', async () => {
  const f = fixture(); f.context.assertion = '';
  expect(await initialReleaseProof(f.context)).toMatchObject({ bootstrap: false });
  expect(f.read).not.toHaveBeenCalled();
  f.context.assertion = `${repository}|${base}|${sha}`;
  expect(await initialReleaseProof(f.context)).toMatchObject({ bootstrap: true, priorAttempts: 0, assertion: `${repository}|${base}|${sha}`, identity: { repository, site: base, sha, runId: 100, attempt: 1 } });
});
it.each(['assertion', 'repository', 'base', 'sha', 'event', 'ref', 'runId', 'attempt'] as const)('refuses a mismatched or malformed %s', async field => {
  const f = fixture(); (f.context as any)[field] = field === 'runId' || field === 'attempt' ? 0 : 'wrong';
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(false); expect(f.read).not.toHaveBeenCalled();
});
it('recovers an early failure only from complete source-bound skipped deployment evidence', async () => {
  const f = fixture([current, prior]);
  expect(await initialReleaseProof(f.context)).toMatchObject({ bootstrap: true, priorAttempts: 1 });
  expect(f.read.mock.calls.map(call => call[0])).toContain('actions/runs/99/attempts/1/jobs?per_page=100');
});
it('still recognizes the previously reviewed single-job named-deployment workflow', async () => {
  const previousSource = readFileSync('tests/pwa/fixtures/pages-single-job.yml');
  expect(workflowHash(previousSource)).toBe('de430de62d48920f76ee189671f7c734e8e0d43deea3720aca1fdbd88131fcce');
  const f = fixture([current,prior],[job()]), read = f.context.read;
  f.context.read = async path => path.startsWith('contents/')
    ? { data: { type:'file',path:'.github/workflows/pages.yml',encoding:'base64',content:previousSource.toString('base64'),size:previousSource.length },hasNext:false }
    : read(path);
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(true);
});
it.each(['success','failure','cancelled','startup_failure'])('permits a never-deployed release skipped by a %s change gate', async outcome => {
  const skipped = { ...job(), conclusion: 'skipped', steps: [] };
  expect((await initialReleaseProof(fixture([current, prior], [gate(prior, outcome), skipped]).context)).bootstrap).toBe(true);
});
it('refuses a contradictory whole-job skip with an attempted deploy or an unknown extra job', async () => {
  expect((await initialReleaseProof(fixture([current,prior],[gate(),{...job(prior,'success'),conclusion:'skipped'}]).context)).bootstrap).toBe(false);
  expect((await initialReleaseProof(fixture([current,prior],[gate(),job(),{...gate(),id:44,name:'other'}]).context)).bootstrap).toBe(false);
});
it.each(['success', 'failure', 'cancelled', 'timed_out'])('refuses any %s deployment attempt', async conclusion => {
  expect((await initialReleaseProof(fixture([current, prior], [gate(), job(prior, conclusion)]).context)).bootstrap).toBe(false);
});
it('includes a previous attempt of the currently rerunning workflow', async () => {
  const run = { ...current, run_attempt: 2 }, f = fixture([run], [gate(run), job(run, 'success')]); f.context.attempt = 2;
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(false);
  expect(f.read.mock.calls.map(call => call[0])).toContain('actions/runs/100/attempts/1/jobs?per_page=100');
});
it('does not hide another branch that attempted deployment', async () => {
  const run = { ...prior, head_branch: 'experiment' };
  expect((await initialReleaseProof(fixture([current, run], [job(run, 'success')]).context)).bootstrap).toBe(false);
});
it.each([
  { ...prior, status: 'in_progress', conclusion: null }, { ...prior, path: '.github/workflows/other.yml' },
  { ...prior, workflow_id: 6 }, { ...prior, repository: { full_name: 'Other/Game' } },
  { ...prior, id: -1 }, { ...prior, run_attempt: 101 }, { ...prior, head_sha: 'bad' },
])('refuses unknown run identity/status %#', async run => {
  expect((await initialReleaseProof(fixture([current, run]).context)).bootstrap).toBe(false);
});
it.each([
  [], [{ ...job(), name: 'unknown' }], [{ ...job(), head_sha: sha }], [{ ...job(), run_id: 7 }],
  [{ ...job(), status: 'in_progress' }], [{ ...job(), steps: [] }],
  [{ ...job(), steps: [{ number: 1, name: 'Something else', status: 'completed', conclusion: 'skipped' }] }],
  [{ ...job(), steps: [job().steps[1], job().steps[1]] }],
].map(jobs => ({ jobs })))('refuses missing or unknown job/step provenance %#', async ({ jobs }) => {
  expect((await initialReleaseProof(fixture([current, prior], jobs).context)).bootstrap).toBe(false);
});
it('refuses truncated pagination or malformed histories instead of assuming empty', async () => {
  for (const response of [{ data: { total_count: 2, workflow_runs: [current] }, hasNext: false }, { ...page('workflow_runs', [current]), hasNext: true }, { data: { total_count: 101, workflow_runs: [current] }, hasNext: false }, page('workflow_runs', []), page('workflow_runs', [current, current])]) {
    const f = fixture(); f.context.read = async () => response;
    expect((await initialReleaseProof(f.context)).bootstrap).toBe(false);
  }
  const f = fixture([current, prior]); const original = f.context.read;
  f.context.read = async path => path.includes('/jobs?') ? { data: { total_count: 2, jobs: [job()] }, hasNext: false } : original(path);
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(false);
});
it('rejects unrecognized historical source bytes and incomplete source delivery', async () => {
  for (const file of [{ type: 'file', path: '.github/workflows/pages.yml', encoding: 'base64', content: Buffer.from('different workflow').toString('base64'), size: 18 }, { type: 'file', path: '.github/workflows/pages.yml', encoding: 'base64', content: source.toString('base64'), size: source.length + 1 }]) {
    const f = fixture([current, prior]); const original = f.context.read;
    f.context.read = async path => path.startsWith('contents/') ? { data: file, hasNext: false } : original(path);
    expect((await initialReleaseProof(f.context)).bootstrap).toBe(false);
  }
});
it('normalizes only source checkout line endings, preserving exact remaining bytes', () => {
  const lf = source.toString().replaceAll('\r\n', '\n');
  expect(workflowHash(Buffer.from(lf.replaceAll('\n', '\r\n')))).toBe(workflowHash(Buffer.from(lf)));
  expect(workflowHash(Buffer.concat([source, Buffer.from(' ')]))).not.toBe(workflowHash(source));
  expect(() => workflowHash(Buffer.from('bad\rsource'))).toThrow();
});

it('refuses an unknown step outcome or empty name even beside an explicitly skipped deploy', async () => {
  for (const patch of [{ conclusion: 'unknown' }, { name: '' }]) {
    const original = job(), invalid = { ...original, steps: [{ ...original.steps[0], ...patch }, original.steps[1]] };
    expect((await initialReleaseProof(fixture([current, prior], [gate(), invalid]).context)).bootstrap).toBe(false);
  }
});
