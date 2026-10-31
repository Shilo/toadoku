import { sha256 } from './identity.ts';
import { REVISION } from './source.ts';
import type { PoolId, RecordTuple, ShardDescriptor } from '../../src/lib/catalog/types.ts';
const metadata = ['toadodu:membership:v1:duplicate-odd', '1', '1', REVISION];
export function recordLeafSync(tuple: RecordTuple, pool: PoolId, ordinal: number): string {
  return sha256(Buffer.concat([Buffer.from([0]), Buffer.from(JSON.stringify([...metadata, pool, ordinal, ...tuple]))]));
}
export function shardLeafSync(shard: Pick<ShardDescriptor, 'pool' | 'start' | 'count' | 'recordRoot'>): string {
  return sha256(Buffer.concat([Buffer.from([2]), Buffer.from(JSON.stringify([...metadata, shard.pool, shard.start, shard.count, shard.recordRoot]))]));
}
export function levelsSync(leaves: readonly string[], prefix: 1 | 3): string[][] {
  if (!leaves.length) throw new Error('empty membership tree');
  const levels = [[...leaves]];
  while (levels.at(-1)!.length > 1) {
    const previous = levels.at(-1)!, next: string[] = [];
    for (let i = 0; i < previous.length; i += 2) next.push(sha256(Buffer.concat([Buffer.from([prefix]), Buffer.from(previous[i], 'hex'), Buffer.from(previous[i + 1] ?? previous[i], 'hex')])));
    levels.push(next);
  }
  return levels;
}
