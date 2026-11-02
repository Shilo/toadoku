import { createHash } from 'node:crypto';

const WORKFLOW = '.github/workflows/pages.yml';
// git show 6e73320:.github/workflows/pages.yml, normalized only from CRLF to LF.
const LEGACY_WORKFLOW_SHA256 = 'b0b6ff33a973346600918f306a09b1fb58e150309c00d677ebbee28a875db7ad';
// Reviewed single-job workflow before conditional publication; canonical LF bytes.
const SINGLE_JOB_WORKFLOWS = new Map([
  [LEGACY_WORKFLOW_SHA256, 'Run actions/deploy-pages@v4'],
  ['de430de62d48920f76ee189671f7c734e8e0d43deea3720aca1fdbd88131fcce', 'Deploy verified Pages artifact'],
]);
// Reviewed gated workflows before automatic first publication.
const GATED_WORKFLOWS = new Set([
  '605485d0dfb6391eca1274f2f61de909b455ae264fc5bac7e251d2da3391914c',
  '0a3bf2611d7a1075e4b196fc6d530af2dfc112a91f9c95dd2bbafe281a60e04f',
]);
const positive = value => Number.isSafeInteger(value) && value > 0;
const terminal = value => ['success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required', 'neutral', 'stale', 'startup_failure'].includes(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
export function workflowHash(source) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(source);
  if (source.byteLength > 64 * 1024 || /\r(?!\n)/.test(text)) throw new Error('Unknown workflow source encoding/size');
  return createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
}
function complete(page, key) {
  const data = page?.data, values = data?.[key];
  if (page?.hasNext || !Array.isArray(values) || !Number.isSafeInteger(data.total_count) || data.total_count < 0 || data.total_count > 100 || data.total_count !== values.length) throw new Error(`Incomplete ${key} history`);
  return values;
}
function workflowPath(run) {
  return run.path === WORKFLOW || run.path === `${WORKFLOW}@${run.head_branch}` || run.path === `${WORKFLOW}@refs/heads/${run.head_branch}`;
}
function failedBeforeRunner(job, attempt) {
  if (job.conclusion !== 'failure' || job.run_attempt !== attempt || job.steps.length !== 0 ||
    !['runner_id', 'runner_name', 'runner_group_id', 'runner_group_name'].every(key => job[key] === null)) return false;
  const value = job.started_at;
  if (typeof value !== 'string' || value !== job.completed_at || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  const canonical = value.includes('.') ? value.replace(/\.(\d+)Z$/, (_, digits) => `.${digits.padEnd(3, '0')}Z`) : value.replace('Z', '.000Z');
  return Number.isFinite(time) && new Date(time).toISOString() === canonical;
}
/** Automatic new-site initialization assumes the repository/URL have no erased or external publication history. */
export async function initialReleaseProof(context) {
  const no = reason => ({ bootstrap: false, reason });
  try {
    const { repository, base, sha, event, ref, runId, attempt, source, read } = context;
    const site = new URL(base);
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || site.protocol !== 'https:' || site.href !== base || !site.pathname.endsWith('/') || site.search || site.hash || site.username || site.password || !commit(sha) || !['push', 'workflow_dispatch'].includes(event) || ref !== 'refs/heads/main' || !positive(runId) || !positive(attempt) || attempt > 100) return no('Invalid first-publication target or current main workflow identity');
    const assertion = `${repository}|${base}|${sha}`;
    const currentHash = workflowHash(source);
    const hashes = new Map([[sha, currentHash]]);
    const runs = complete(await read('actions/workflows/pages.yml/runs?per_page=100'), 'workflow_runs');
    const current = runs.find(run => run.id === runId);
    if (!current || current.head_sha !== sha || current.head_branch !== 'main' || current.run_attempt !== attempt || current.status !== 'in_progress' || !positive(current.workflow_id)) throw new Error('Current asserted workflow run is missing or changed');
    const seen = new Set(); let priorAttempts = 0;
    for (const run of runs) {
      if (!positive(run.id) || seen.has(run.id) || !commit(run.head_sha) || !positive(run.run_attempt) || !workflowPath(run) || run.workflow_id !== current.workflow_id || run.repository?.full_name !== repository || typeof run.head_branch !== 'string' || !run.head_branch || run.id !== runId && (run.status !== 'completed' || !terminal(run.conclusion))) throw new Error('Unknown workflow run identity/status');
      seen.add(run.id);
      const count = run.run_attempt - (run.id === runId ? 1 : 0);
      priorAttempts += count;
      if (priorAttempts > 100) throw new Error('Prior attempts exceed bounded history');
      if (!count) continue;
      let hash = hashes.get(run.head_sha);
      if (!hash) {
        const { data: file, hasNext } = await read(`contents/${WORKFLOW}?ref=${run.head_sha}`);
        if (hasNext || file?.type !== 'file' || file.path !== WORKFLOW || file.encoding !== 'base64' || typeof file.content !== 'string' || file.content.length > 90 * 1024 || !/^[A-Za-z0-9+/=\r\n]*$/.test(file.content)) throw new Error('Unknown historical workflow provenance');
        const bytes = Buffer.from(file.content, 'base64');
        if (!Number.isSafeInteger(file.size) || file.size !== bytes.length) throw new Error('Incomplete historical workflow source');
        hash = workflowHash(bytes); hashes.set(run.head_sha, hash);
      }
      const previousDeployName = SINGLE_JOB_WORKFLOWS.get(hash);
      if (hash !== currentHash && !previousDeployName && !GATED_WORKFLOWS.has(hash)) throw new Error('Unrecognized historical workflow source');
      const deployName = previousDeployName ?? 'Deploy verified Pages artifact';
      for (let number = 1; number <= count; number++) {
        const jobs = complete(await read(`actions/runs/${run.id}/attempts/${number}/jobs?per_page=100`), 'jobs');
        const names = previousDeployName ? ['release'] : ['changes', 'release'];
        if (jobs.length !== names.length || new Set(jobs.map(job => job.name)).size !== names.length) throw new Error('Missing or unknown release jobs');
        for (const candidate of jobs) {
          if (!positive(candidate.id) || candidate.run_id !== run.id || candidate.head_sha !== run.head_sha || !names.includes(candidate.name) || candidate.status !== 'completed' || !terminal(candidate.conclusion) || !Array.isArray(candidate.steps)) throw new Error('Unknown release job provenance/status');
          const numbers = new Set();
          for (const step of candidate.steps) {
            if (!positive(step.number) || numbers.has(step.number) || typeof step.name !== 'string' || !step.name || step.status !== 'completed' || !terminal(step.conclusion)) throw new Error('Incomplete release steps');
            numbers.add(step.number);
          }
        }
        const job = jobs.find(job => job.name === 'release');
        // A trusted needs/if gate can skip the entire protected job, including after gate failure.
        if (!previousDeployName && job.conclusion === 'skipped' && job.steps.every(step => step.conclusion === 'skipped')) continue;
        // GitHub marks an environment-setup failure completed before assigning a runner. The known
        // inline deployment cannot execute with no assigned runner, no steps and zero duration.
        if (failedBeforeRunner(job, number)) continue;
        const deployments = job.steps.filter(step => step.name === deployName);
        if (deployments.length !== 1 || deployments[0].conclusion !== 'skipped') throw new Error('Deployment was attempted or its skipped state is unknown');
      }
    }
    return { bootstrap: true, reason: 'Automatic new-site initialization with complete returned history showing skipped deployment', priorAttempts, assertion, identity: { repository, site: base, sha, runId, attempt } };
  } catch (error) { return no(`First-publication proof unavailable: ${error.message}`); }
}
