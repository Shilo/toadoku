import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { initialReleaseProof, workflowHash, type BootstrapContext } from '../../tools/pwa/bootstrap.mjs';
const source = readFileSync('.github/workflows/pages.yml');
const sha = 'a'.repeat(40), otherSha = 'b'.repeat(40), repository = 'Owner/Game', base = 'https://owner.github.io/game/';
const current = { id: 100, workflow_id: 5, head_sha: sha, head_branch: 'main', run_attempt: 1, status: 'in_progress', conclusion: null, path: '.github/workflows/pages.yml', repository: { full_name: repository } };
const prior = { ...current, id: 99, head_sha: otherSha, status: 'completed', conclusion: 'failure' };
const job = (run: Pick<typeof prior, 'id' | 'head_sha'> = prior, conclusion = 'skipped') => ({ id: 42, run_id: run.id, head_sha: run.head_sha, name: 'release', status: 'completed', conclusion: 'failure', steps: [{ number: 1, name: 'Build current complete offline closure', status: 'completed', conclusion: 'failure' }, { number: 2, name: 'Deploy verified Pages artifact', status: 'completed', conclusion }] });
const gate = (run: Pick<typeof prior, 'id' | 'head_sha'> = prior, conclusion = 'success') => ({ id: 43, run_id: run.id, head_sha: run.head_sha, name: 'changes', status: 'completed', conclusion, steps: [] });
// Observed GitHub environment-setup failure: Shilo/toadoku job 125039993902, before any runner assignment.
const noRunnerJob = (run: Pick<typeof prior, 'id' | 'head_sha'> = prior) => ({ ...job(run), run_attempt: 1,
  runner_id: null, runner_name: null, runner_group_id: null, runner_group_name: null,
  started_at: '2026-11-02T01:05:18Z', completed_at: '2026-11-02T01:05:18Z', steps: [] });
const page = (key: string, values: any[]) => ({ data: { total_count: values.length, [key]: values }, hasNext: false });
function fixture(runs: any[] = [current], jobs: any[] = [gate(), job()]) {
  const read = vi.fn(async (path: string) => {
    if (path === 'actions/workflows/pages.yml/runs?per_page=100') return page('workflow_runs', runs);
    if (path === `contents/.github/workflows/pages.yml?ref=${otherSha}`) return { data: { type: 'file', path: '.github/workflows/pages.yml', encoding: 'base64', content: source.toString('base64'), size: source.length }, hasNext: false };
    if (/^actions\/runs\/\d+\/attempts\/\d+\/jobs\?per_page=100$/.test(path)) return page('jobs', jobs);
    throw Error('Unexpected fixture read: ' + path);
  });
  const context: BootstrapContext = { repository, base, sha, event: 'push', ref: 'refs/heads/main', runId: 100, attempt: 1, source, read };
  return { context, read };
}
it.each(['push', 'workflow_dispatch'])('automatically initializes from trusted main %s with exact repository, configured site and source', async event => {
  const f = fixture(); f.context.event = event;
  expect(await initialReleaseProof(f.context)).toMatchObject({ bootstrap: true, priorAttempts: 0, assertion: `${repository}|${base}|${sha}`, identity: { repository, site: base, sha, runId: 100, attempt: 1 } });
});
it.each(['repository', 'base', 'sha', 'event', 'ref', 'runId', 'attempt'] as const)('refuses a mismatched or malformed %s', async field => {
  const f = fixture(); (f.context as any)[field] = field === 'runId' || field === 'attempt' ? 0 : 'wrong';
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(false); expect(f.read).not.toHaveBeenCalled();
});
it('recovers an early failure only from complete source-bound skipped deployment evidence', async () => {
  const f = fixture([current, prior]);
  expect(await initialReleaseProof(f.context)).toMatchObject({ bootstrap: true, priorAttempts: 1 });
  expect(f.read.mock.calls.map(call => call[0])).toContain('actions/runs/99/attempts/1/jobs?per_page=100');
});
it.each(['2026-11-02T01:05:18Z', '2026-11-02T01:05:18.000Z'])('recovers a known inline release failed before runner assignment at %s', async timestamp => {
  const failed = { ...noRunnerJob(), started_at: timestamp, completed_at: timestamp };
  expect((await initialReleaseProof(fixture([current, prior], [gate(), failed]).context)).bootstrap).toBe(true);
});
it('binds an unassigned runner failure to the examined prior rerun attempt', async () => {
  const run = { ...current, run_attempt: 2 }, failed = noRunnerJob(run);
  const f = fixture([run], [gate(run), failed]); f.context.attempt = 2;
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(true);
  failed.run_attempt = 2;
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(false);
});
it.each([
  ...['runner_id', 'runner_name', 'runner_group_id', 'runner_group_name'].flatMap(field => [
    { name: `missing ${field}`, patch: (candidate: any) => { delete candidate[field]; } },
    { name: `assigned ${field}`, patch: (candidate: any) => { candidate[field] = field.endsWith('_id') ? 1 : 'assigned runner'; } },
  ]),
  { name: 'missing attempt', patch: (candidate: any) => { delete candidate.run_attempt; } },
  { name: 'wrong attempt', patch: (candidate: any) => { candidate.run_attempt = 2; } },
  { name: 'nonzero duration', patch: (candidate: any) => { candidate.completed_at = '2026-11-02T01:05:19Z'; } },
  { name: 'missing timestamp', patch: (candidate: any) => { delete candidate.started_at; } },
  { name: 'malformed timestamps', patch: (candidate: any) => { candidate.started_at = candidate.completed_at = 'invalid'; } },
  { name: 'impossible calendar date', patch: (candidate: any) => { candidate.started_at = candidate.completed_at = '2026-02-31T01:05:18Z'; } },
  { name: 'an executed step', patch: (candidate: any) => { candidate.steps = [{ number: 1, name: 'Set up job', status: 'completed', conclusion: 'failure' }]; } },
  ...['cancelled', 'success', 'startup_failure', 'timed_out'].map(conclusion => ({ name: `conclusion ${conclusion}`, patch: (candidate: any) => { candidate.conclusion = conclusion; } })),
])('refuses an uncertain empty failure with $name', async ({ patch }) => {
  const failed = noRunnerJob(); patch(failed);
  expect((await initialReleaseProof(fixture([current, prior], [gate(), failed]).context)).bootstrap).toBe(false);
});
it('does not accept an unassigned runner failure from unrecognized historical workflow source', async () => {
  const f = fixture([current, prior], [gate(), noRunnerJob()]), read = f.context.read;
  const unknown = Buffer.from('unrecognized workflow');
  f.context.read = async path => path.startsWith('contents/')
    ? { data: { type: 'file', path: '.github/workflows/pages.yml', encoding: 'base64', content: unknown.toString('base64'), size: unknown.length }, hasNext: false }
    : read(path);
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(false);
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
it.each([
  ['pages-gated-string-input.yml', '605485d0dfb6391eca1274f2f61de909b455ae264fc5bac7e251d2da3391914c'],
  ['pages-gated-checkbox.yml', '0a3bf2611d7a1075e4b196fc6d530af2dfc112a91f9c95dd2bbafe281a60e04f'],
])('recovers skipped first deployment from previously reviewed gated workflow %s', async (file, hash) => {
  const previousSource = readFileSync(`tests/pwa/fixtures/${file}`);
  expect(workflowHash(previousSource)).toBe(hash);
  const f = fixture([current, prior]), read = f.context.read;
  f.context.read = async path => path.startsWith('contents/')
    ? { data: { type:'file',path:'.github/workflows/pages.yml',encoding:'base64',content:previousSource.toString('base64'),size:previousSource.length },hasNext:false }
    : read(path);
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(true);
  f.context.read = async path => path.includes('/jobs?') ? page('jobs', [gate(), job(prior, 'success')])
    : path.startsWith('contents/') ? { data: { type:'file',path:'.github/workflows/pages.yml',encoding:'base64',content:previousSource.toString('base64'),size:previousSource.length },hasNext:false } : read(path);
  expect((await initialReleaseProof(f.context)).bootstrap).toBe(false);
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
