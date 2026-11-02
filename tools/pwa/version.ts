import { execFileSync } from 'node:child_process';
import { releasePathspecs } from './release-inputs.mjs';

/** PixelDoll's commit-count numbering: 1234 relevant commits becomes 1.2.34. */
export const formatVersion = (count: number) => `${Math.floor(count / 1000)}.${Math.floor(count / 100) % 10}.${count % 100}`;

/** Same history/count/commit workflow as PixelDoll, using Toadoku's production paths. */
export function appVersion(cwd: string) {
  const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 }).trim();
  if (git('rev-parse', '--is-shallow-repository') !== 'false') throw new Error('version: full git history needed (actions/checkout fetch-depth: 0)');
  // Walk both sides of merges, count app-changing non-merge commits once, exclude docs/test-only commits.
  const count = Number(git('rev-list', '--count', '--full-history', '--no-merges', 'HEAD', '--', ...releasePathspecs()));
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('version: no commits touch production inputs, or commit count is invalid');
  return { version: formatVersion(count), commit: git('rev-parse', '--short=7', 'HEAD') };
}
