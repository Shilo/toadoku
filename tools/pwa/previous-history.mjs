const WINDOW = 30 * 86400_000;
const STAGE = 'Stage retained asset archive';
const NAME = 'toadoku-retained-assets';
const DEPLOY_STEPS = ['Deploy verified Pages artifact', 'Run actions/deploy-pages@v4'];
const SHA = /^[a-f0-9]{40}$/;
const positive = value => Number.isSafeInteger(value) && value > 0;
const terminal = value => ['success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required', 'neutral', 'stale', 'startup_failure'].includes(value);

function timestamp(value, now) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) throw new Error('Invalid publication timestamp');
  const time = Date.parse(value);
  const canonical = value.includes('.') ? value.replace(/\.(\d+)Z$/, (_, digits) => `.${digits.padEnd(3, '0')}Z`) : value.replace('Z', '.000Z');
  if (!Number.isFinite(time) || new Date(time).toISOString() !== canonical || time > now + 5 * 60_000) throw new Error('Unknown publication clock');
  return time;
}
function complete(page, key) {
  const values = page?.data?.[key];
  if (page?.hasNext || !Array.isArray(values) || values.length > 100 || page.data.total_count !== values.length) throw new Error(`Incomplete publication ${key} inventory`);
  return values;
}
function jobLink(value, repository) {
  const match = typeof value === 'string' && /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/actions\/runs\/([1-9]\d*)\/job\/([1-9]\d*)$/.exec(value);
  if (!match || match[1].toLowerCase() !== repository.toLowerCase() || !positive(Number(match[2])) || !positive(Number(match[3]))) throw new Error('Unknown deployment job link');
  return { runId: Number(match[2]), jobId: Number(match[3]), url: value };
}
function workflowPath(value) {
  return ['.github/workflows/pages.yml', '.github/workflows/pages.yml@main', '.github/workflows/pages.yml@refs/heads/main'].includes(value);
}

/** Deployment jobs, rather than every cheap change-check run, index possible archive uploads. */
export async function previousArchive({ repository, runId, attempt, read, now = Date.now() }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !positive(runId) || !positive(attempt) || !Number.isFinite(now)) throw new Error('Invalid publication history context');
  const deployments = [], ids = new Set();
  // REST does not promise a sort order. Complete metadata pagination before excluding old records.
  for (let page = 1; ; page++) {
    if (page > 100) throw new Error('Publication deployment metadata exceeds bounded scan');
    const result = await read(`deployments?environment=github-pages&per_page=100&page=${page}`);
    if (!Array.isArray(result?.data) || result.data.length > 100 || result.hasNext && !result.data.length) throw new Error('Incomplete publication deployment history');
    for (const deployment of result.data) {
      if (!positive(deployment.id) || ids.has(deployment.id) || deployment.environment !== 'github-pages') throw new Error('Unknown publication deployment identity');
      ids.add(deployment.id);
      const created = timestamp(deployment.created_at, now), updated = timestamp(deployment.updated_at, now);
      if (updated < created) throw new Error('Contradictory deployment clock');
      if (now - updated > WINDOW) continue;
      if (!['main', 'refs/heads/main'].includes(deployment.ref) || !SHA.test(deployment.sha ?? '')) throw new Error('Unknown publication deployment source');
      deployments.push(deployment);
    }
    if (!result.hasNext) break;
  }
  const jobs = new Set(), runs = new Map(), inventories = new Map();
  let found;
  for (const deployment of deployments) {
    const statuses = await read(`deployments/${deployment.id}/statuses?per_page=100`);
    if (statuses?.hasNext || !Array.isArray(statuses?.data) || !statuses.data.length || statuses.data.length > 100) throw new Error('Incomplete deployment status history');
    let link;
    const statusIds = new Set();
    for (const status of statuses.data) {
      if (!positive(status.id) || statusIds.has(status.id)) throw new Error('Invalid deployment status identity');
      statusIds.add(status.id); timestamp(status.created_at, now);
      const candidate = jobLink(status.log_url, repository);
      if (link && (link.runId !== candidate.runId || link.jobId !== candidate.jobId)) throw new Error('Deployment points to different jobs');
      link = candidate;
    }
    const job = (await read(`actions/jobs/${link.jobId}`)).data;
    if (!job || job.id !== link.jobId || job.run_id !== link.runId || job.head_sha !== deployment.sha || job.head_branch !== 'main' || job.name !== 'release' || !positive(job.run_attempt) || job.html_url !== link.url || !Array.isArray(job.steps)) throw new Error('Unknown publication job provenance');
    let run = runs.get(link.runId);
    if (!run) {
      run = (await read(`actions/runs/${link.runId}`)).data;
      if (!run || run.id !== link.runId || run.repository?.full_name?.toLowerCase() !== repository.toLowerCase() || !positive(run.repository?.id) || run.head_branch !== 'main' || !workflowPath(run.path) || !['push', 'workflow_dispatch'].includes(run.event) || !positive(run.run_attempt) || !['queued', 'waiting', 'pending', 'requested', 'in_progress', 'completed'].includes(run.status) || run.status === 'completed' && !terminal(run.conclusion)) throw new Error('Unknown publication workflow provenance');
      runs.set(link.runId, run);
    }
    if (run.head_sha !== job.head_sha || run.run_attempt < job.run_attempt) throw new Error('Contradictory publication attempt');
    if (job.run_id === runId && job.run_attempt === attempt) continue;
    if (jobs.has(job.id)) continue;
    jobs.add(job.id);
    // Later queued releases can acquire environment records while this job holds the release lock.
    if (job.status === 'queued' && job.started_at === null && !job.steps.length) continue;
    if (job.status !== 'completed' || !terminal(job.conclusion)) throw new Error('Another publication job has uncertain progress');
    const started = timestamp(job.started_at, now), completed = timestamp(job.completed_at, now);
    if (completed < started) throw new Error('Contradictory publication job clock');
    const stepIds = new Set();
    for (const step of job.steps) {
      if (!positive(step.number) || stepIds.has(step.number) || typeof step.name !== 'string' || !step.name || step.status !== 'completed' || !terminal(step.conclusion)) throw new Error('Incomplete publication job steps');
      stepIds.add(step.number);
    }
    const stages = job.steps.filter(step => step.name === STAGE);
    if (stages.length > 1) throw new Error('Ambiguous retained archive upload');
    const stage = stages[0];
    if (!stage || stage.conclusion !== 'success') {
      const deploys = job.steps.filter(step => DEPLOY_STEPS.includes(step.name));
      if (deploys.length !== 1 || deploys[0].conclusion !== 'skipped') throw new Error('Deployment was attempted without a successful retained archive upload');
      continue;
    }
    const uploadStarted = timestamp(stage.started_at, now), uploadCompleted = timestamp(stage.completed_at, now);
    if (uploadStarted < started || uploadCompleted < uploadStarted || uploadCompleted > completed) throw new Error('Contradictory retained archive upload clock');
    // Old expired archives are harmless after the complete supported asset window. The current host
    // is still independently retained by retain.mjs, including after a long publication pause.
    if (now - uploadCompleted > WINDOW) continue;
    let artifacts = inventories.get(run.id);
    if (!artifacts) {
      artifacts = complete(await read(`actions/runs/${run.id}/artifacts?per_page=100`), 'artifacts');
      inventories.set(run.id, artifacts);
    }
    const matches = artifacts.filter(artifact => {
      if (artifact.name !== NAME) return false;
      if (!positive(artifact.id) || typeof artifact.expired !== 'boolean' || !Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes < 0 || artifact.workflow_run?.id !== run.id || artifact.workflow_run?.head_sha !== run.head_sha || artifact.workflow_run?.head_branch !== 'main' || artifact.workflow_run?.repository_id !== run.repository.id || artifact.workflow_run?.head_repository_id !== run.repository.id) throw new Error('Unknown retained archive provenance');
      const created = timestamp(artifact.created_at, now);
      return !artifact.expired && created >= uploadStarted && created <= uploadCompleted;
    });
    // Run ids alone cannot bind an artifact to a particular rerun. Its creation time must fall
    // within this successful upload step, or an older attempt could conceal a missing archive.
    if (matches.length !== 1) throw new Error('A recent uploaded archive is missing or ambiguous; publication refused');
    const archive = matches[0];
    if (!found || Date.parse(archive.created_at) > Date.parse(found.created_at)) found = archive;
    else if (Date.parse(archive.created_at) === Date.parse(found.created_at) && archive.id !== found.id) throw new Error('Ambiguous newest retained archive');
  }
  return found;
}
