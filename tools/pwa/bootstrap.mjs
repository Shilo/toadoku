import { createHash } from 'node:crypto';

const WORKFLOW = '.github/workflows/pages.yml';
// git show 6e73320:.github/workflows/pages.yml, normalized only from CRLF to LF.
const LEGACY_WORKFLOW_SHA256 = 'b0b6ff33a973346600918f306a09b1fb58e150309c00d677ebbee28a875db7ad';
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
/** Owner assertion covers provenance outside currently returned Actions history, not a 404 override. */
export async function initialReleaseProof(context) {
  const no = reason => ({ bootstrap: false, reason });
  if (!context.assertion) return no('First publication requires the scoped initial_release assertion; see docs/pwa-system.md');
  try {
    const { repository, base, sha, event, ref, runId, attempt, source, read } = context;
    const site = new URL(base);
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || site.protocol !== 'https:' || site.href !== base || !site.pathname.endsWith('/') || site.search || site.hash || site.username || site.password || !commit(sha) || event !== 'workflow_dispatch' || ref !== 'refs/heads/main' || !positive(runId) || !positive(attempt) || attempt > 100 || context.assertion !== `${repository}|${base}|${sha}`) return no('Invalid scoped initial_release assertion or current main workflow identity');
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
      if (hash !== currentHash && hash !== LEGACY_WORKFLOW_SHA256) throw new Error('Unrecognized historical workflow source');
      const deployName = hash === LEGACY_WORKFLOW_SHA256 ? 'Run actions/deploy-pages@v4' : 'Deploy verified Pages artifact';
      for (let number = 1; number <= count; number++) {
        const jobs = complete(await read(`actions/runs/${run.id}/attempts/${number}/jobs?per_page=100`), 'jobs');
        if (jobs.length !== 1) throw new Error('Missing or unknown release job');
        const job = jobs[0];
        if (!positive(job.id) || job.run_id !== run.id || job.head_sha !== run.head_sha || job.name !== 'release' || job.status !== 'completed' || !terminal(job.conclusion) || !Array.isArray(job.steps) || !job.steps.length) throw new Error('Unknown release job provenance/status');
        const numbers = new Set();
        for (const step of job.steps) {
          if (!positive(step.number) || numbers.has(step.number) || typeof step.name !== 'string' || !step.name || step.status !== 'completed' || !terminal(step.conclusion)) throw new Error('Incomplete release steps');
          numbers.add(step.number);
        }
        const deployments = job.steps.filter(step => step.name === deployName);
        if (deployments.length !== 1 || deployments[0].conclusion !== 'skipped') throw new Error('Deployment was attempted or its skipped state is unknown');
      }
    }
    return { bootstrap: true, reason: 'Scoped pristine-target assertion and complete returned prior-attempt history with skipped deployment steps', priorAttempts, assertion: context.assertion, identity: { repository, site: base, sha, runId, attempt } };
  } catch (error) { return no(`First-publication proof unavailable: ${error.message}`); }
}
