import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CatalogLoader } from '../../src/lib/catalog/load';
import { branch, inclusionProof, manifestMembership, merkleLevels, recordLeaf, shardLeaf, verifyAttestedRecord } from '../../src/lib/catalog/attestation';
import type { AttestedRecord, CatalogManifest } from '../../src/lib/catalog/types';
const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const fetcher = (async (input: string | URL | Request) => new Response(new Uint8Array(await readFile(`public/catalog/v1/${new URL(String(input)).pathname.split('/').at(-1)}`)))) as typeof fetch;
async function certifiedRecord() {
  const loader = new CatalogLoader('https://example.test/toadoku/catalog/v1/', { fetcher });
  const result = await loader.getRecord('easy', 0);
  if (result.kind !== 'ready') throw new Error(JSON.stringify(result));
  return result.value;
}
describe('offline certified catalog membership', () => {
  it('pins default leaf protocol bytes independently and rejects decorated hash encodings',async()=>{
    const record=await certifiedRecord();
    const metadata=['toadodu:membership:v1:duplicate-odd','1','1','d8c8ebaee0c08c412cfba96af1923dfa61c83317'];
    const tuple=[record.id,record.groupId,record.sourceId,record.givens,record.solution,record.ratingTenths,['easy.txt','medium.txt','hard.txt','diabolical.txt'].indexOf(record.sourceFile)];
    const expected=(prefix:number,value:unknown)=>sha(Buffer.concat([Buffer.from([prefix]),Buffer.from(JSON.stringify(value),'utf8')]));
    expect(await recordLeaf(record,'easy',0)).toBe(expected(0,[...metadata,'easy',0,...tuple]));
    const descriptor={pool:'easy' as const,start:0,count:200,recordRoot:'a'.repeat(64)};
    expect(await shardLeaf(descriptor)).toBe(expected(2,[...metadata,'easy',0,200,descriptor.recordRoot]));
    for(const hash of ['x'+'a'.repeat(64),'a'.repeat(64)+'x','a'.repeat(64)+'\n']){
      expect(()=>branch(hash,'b'.repeat(64),1)).toThrow();expect(()=>branch('b'.repeat(64),hash,3)).toThrow();
    }
    for(const decoration of ['prefix','suffix','newline']){
      const invalid=structuredClone(record),original=invalid.attestation.recordSiblings[0];
      invalid.attestation.recordSiblings[0]=decoration==='prefix'?'x'+original:original+(decoration==='suffix'?'x':'\n');
      expect(await verifyAttestedRecord(invalid)).toBe(false);
    }
  });
  it('duplicate-odd trees match independently reduced SHA256 binary pairs', async () => {
    for (const count of [1, 2, 3, 5, 8, 9, 17, 127, 208, 256, 488]) {
      const leaves = Array.from({ length: count }, (_, i) => sha(new TextEncoder().encode(`leaf${i}`)));
      let expected = leaves.slice();
      while (expected.length > 1) {
        const parents: string[] = [];
        for (let i = 0; i < expected.length; i += 2) parents.push(sha(Buffer.concat([Buffer.from([1]), Buffer.from(expected[i], 'hex'), Buffer.from(expected[i + 1] ?? expected[i], 'hex')])));
        expected = parents;
      }
      const tree = await merkleLevels(leaves, 1);
      expect(tree.at(-1)).toEqual(expected);
      for (let index = 0; index < count; index++) expect(inclusionProof(tree, index)).toHaveLength(Math.ceil(Math.log2(count)));
    }
  });
  it('verifies a complete definition without a network/catalog dependency', async () => {
    const record = await certifiedRecord();
    expect(await verifyAttestedRecord(record)).toBe(true);
    // Verification's only authority is its compiled historical root and the snapshot proof.
    expect(await verifyAttestedRecord(JSON.parse(JSON.stringify(record)))).toBe(true);
    expect(JSON.stringify(record.attestation).length).toBeLessThan(1600);
  });
  it('rejects altered certified metadata and every proof boundary', async () => {
    const record = await certifiedRecord();
    const mutations: ((r: AttestedRecord) => void)[] = [
      r => { (r as { ratingTenths: number }).ratingTenths = 13; },
      r => { (r as { sourceFile: string }).sourceFile = 'medium.txt'; },
      r => { (r as { sourceId: string }).sourceId = 'a'.repeat(12); },
      r => { (r as { id: string }).id = 'a'.repeat(64); },
      r => { (r as { groupId: string }).groupId = 'a'.repeat(64); },
      r => { (r as { givens: string }).givens = '0'.repeat(81); },
      r => { (r as { solution: string }).solution = '1'.repeat(81); },
      r => { r.pool = 'medium-low'; }, r => { r.catalogVersion = '2'; }, r => { r.certificationVersion = '2'; }, r => { r.sourceRevision = 'a'.repeat(40); },
      r => { r.attestation.recordIndex = -1; }, r => { r.attestation.recordIndex = r.attestation.recordCount; },
      r => { r.attestation.recordIndex++; }, r => { r.attestation.shardStart++; }, r => { r.attestation.recordCount++; },
      r => { r.attestation.shardIndex++; }, r => { r.attestation.shardCount++; },
      r => { r.attestation.recordSiblings.pop(); }, r => { r.attestation.recordSiblings.push('a'.repeat(64)); },
      r => { r.attestation.shardSiblings[0] = 'a'.repeat(64); }, r => { r.attestation.recordSiblings[0] = 'a'.repeat(64); },
      r => { r.attestation.version = 2 as never; }
    ];
    for (const mutation of mutations) { const modified = structuredClone(record); mutation(modified); expect(await verifyAttestedRecord(modified)).toBe(false); }
  });
  it('rejects invalid tree APIs and untrusted manifest topology before membership acceptance', async () => {
    const hash = 'a'.repeat(64);
    expect(() => branch('bad', hash, 1)).toThrow('membership hash'); expect(() => branch(hash, 'bad', 1)).toThrow('membership hash');
    await expect(merkleLevels([], 1)).rejects.toThrow('membership leaves'); await expect(merkleLevels(['bad'], 1)).rejects.toThrow('membership leaves');
    for (const index of [-1, 1, NaN, 0.5]) expect(() => inclusionProof([[hash]], index)).toThrow('membership index');
    const manifest = JSON.parse(await readFile('public/catalog/v1/manifest.json', 'utf8')) as CatalogManifest;
    expect(await manifestMembership(manifest)).toBeDefined();
    expect(await manifestMembership({ ...manifest, catalogVersion: '2' as never })).toBeUndefined();
    const missing = structuredClone(manifest) as any; missing.pools.easy.shards.pop(); expect(await manifestMembership(missing)).toBeUndefined();
    const count = structuredClone(manifest) as any; count.pools.easy.count++; expect(await manifestMembership(count)).toBeUndefined();
    const root = structuredClone(manifest) as any; root.pools.easy.shards[0].recordRoot = hash; expect(await manifestMembership(root)).toBeUndefined();
    const duplicated=structuredClone(manifest) as any;duplicated.pools['hard-high'].shards.push(...duplicated.pools['hard-high'].shards.slice(-8));
    const independentRoot=(input:CatalogManifest)=>{
      let leaves=Object.values(input.pools).flatMap(pool=>pool.shards).map(descriptor=>sha(Buffer.concat([Buffer.from([2]),Buffer.from(JSON.stringify(['toadodu:membership:v1:duplicate-odd',input.catalogVersion,input.certificationVersion,input.sourceRevision,descriptor.pool,descriptor.start,descriptor.count,descriptor.recordRoot]))])));
      while(leaves.length>1){const parents:string[]=[];for(let index=0;index<leaves.length;index+=2)parents.push(sha(Buffer.concat([Buffer.from([3]),Buffer.from(leaves[index],'hex'),Buffer.from(leaves[index+1]??leaves[index],'hex')])));leaves=parents;}return leaves[0];
    };
    expect(Object.values(duplicated.pools).flatMap((pool:any)=>pool.shards)).toHaveLength(496);expect(independentRoot(duplicated)).toBe(independentRoot(manifest));expect(await manifestMembership(duplicated)).toBeUndefined();
  });
  it('rejects malformed disclosure proofs including duplicate-odd paths and empty/future fields', async () => {
    const record = await certifiedRecord();
    for (const mutation of [
      (r: any) => { r.attestation = undefined; }, (r: any) => { r.attestation.recordSiblings = 'not-array'; },
      (r: any) => { r.attestation.recordSiblings = Array(9).fill('a'.repeat(64)); }, (r: any) => { r.attestation.shardSiblings = 'not-array'; },
      (r: any) => { r.attestation.shardSiblings = Array(17).fill('a'.repeat(64)); }, (r: any) => { r.attestation.shardStart = -1; },
      (r: any) => { r.attestation.recordCount = 0; }, (r: any) => { r.attestation.recordCount = 257; },
      (r: any) => { r.attestation.recordIndex = 0.5; }, (r: any) => { r.attestation.shardIndex = -1; },
      (r: any) => { r.attestation.shardIndex = -512; },
      (r: any) => { r.attestation.shardIndex = NaN; }, (r: any) => { r.attestation.shardIndex = r.attestation.shardCount; },
      (r: any) => { r.attestation.shardSiblings.pop(); }, (r: any) => { r.attestation.shardSiblings[0] = 'bad'; },
      (r: any) => { r.attestation.recordSiblings[0] = 'bad'; }, (r: any) => { r.attestation.shardStart = Number.MAX_SAFE_INTEGER; }
    ]) { const invalid = structuredClone(record); mutation(invalid); expect(await verifyAttestedRecord(invalid)).toBe(false); }
    expect(await verifyAttestedRecord(null as never)).toBe(false);
    const loader = new CatalogLoader('https://example.test/catalog/v1/', { fetcher });
    const last = await loader.getRecord('hard-high', 26038); if (last.kind !== 'ready') throw new Error(JSON.stringify(last));
    expect(last.value.attestation.recordCount).toBe(63); expect(await verifyAttestedRecord(last.value)).toBe(true);
    const aliased=structuredClone(last.value);aliased.attestation.shardIndex+=512;expect(aliased.attestation.shardIndex).toBe(999);expect(await verifyAttestedRecord(aliased)).toBe(false);
    last.value.attestation.recordSiblings[0] = 'a'.repeat(64); expect(await verifyAttestedRecord(last.value)).toBe(false);
  });
});
