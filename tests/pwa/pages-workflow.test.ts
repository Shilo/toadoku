import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
// The committed Workbox build toolchain already includes this parser; no runtime dependency is added.
const { load } = createRequire(import.meta.url)('js-yaml');
const workflow = load(readFileSync('.github/workflows/pages.yml','utf8'));

it('checks every main push, without GitHub truncated path filtering', () => {
  expect(workflow.on.push).toEqual({ branches: ['main'] });
  expect(workflow.on.workflow_dispatch.inputs.initial_release.required).toBe(false);
  expect(workflow.permissions).toEqual({ contents: 'read' });
  expect(workflow.concurrency).toBeUndefined();
});
it('keeps the cheap change job outside the protected publication queue', () => {
  const changes = workflow.jobs.changes;
  expect(changes.environment).toBeUndefined(); expect(changes.concurrency).toBeUndefined();
  expect(changes.outputs.release).toBe('${{ steps.changed.outputs.release }}');
  expect(changes.steps.some((s: any) => s.run === 'node tools/pwa/release-inputs.mjs changed')).toBe(true);
  expect(changes.steps.some((s: any) => /npm|build|deploy-pages|upload-artifact/.test(s.run ?? s.uses ?? ''))).toBe(false);
  expect(changes.steps[0].with['sparse-checkout']).toBe('tools/pwa');
});
it('only relevant main changes enter a non-cancelling bounded publication queue', () => {
  const release = workflow.jobs.release;
  expect(release.needs).toBe('changes');
  expect(release.if).toBe("github.ref == 'refs/heads/main' && needs.changes.outputs.release == 'true'");
  expect(release.concurrency).toEqual({ group:'toadoku-pages', queue:'max', 'cancel-in-progress':false });
  expect(release.permissions).toEqual({ contents:'read', actions:'read', deployments:'read', pages:'write', 'id-token':'write' });
  expect(release.environment.name).toBe('github-pages');
});
it('pins source and official Node24 action revisions, and guards every expensive/release step after freshness', () => {
  for (const job of Object.values(workflow.jobs) as any[]) {
    expect(job.steps[0].with.ref).toBe('${{ github.sha }}');
    for (const step of job.steps) if (step.uses) expect(step.uses).toMatch(/^actions\/[\w-]+@[a-f0-9]{40}$/);
  }
  const steps = workflow.jobs.release.steps, current = steps.findIndex((s: any) => s.id === 'current');
  expect(current).toBeGreaterThan(0);
  expect(steps[current].run).toBe('node tools/pwa/release-inputs.mjs current');
  for (const step of steps.slice(current+1)) expect(step.if).toContain("steps.current.outputs.release == 'true'");
  expect(steps.find((s: any) => s.id === 'deployment').uses).toBe('actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346');
  expect(steps.find((s: any) => s.run?.startsWith('npm test')).run).toBe('npm test -- --maxWorkers=2');
  for (const name of ['toadoku-retained-assets','toadoku-rollback-release','toadoku-hosting-evidence']) {
    expect(steps.find((s: any) => s.with?.name === name).with.archive).toBe(true);
  }
});
