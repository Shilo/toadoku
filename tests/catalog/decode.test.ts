import { describe, expect, it } from 'vitest';
import { decodeManifest, decodeShard, decodeTuple } from '../../src/lib/catalog/decode';
import type { PoolId, ShardDescriptor } from '../../src/lib/catalog/types';

// Structural boundary fixtures only. These fabricated hashes and zero-clue grids are not certificates.
const pools:PoolId[]=['easy','medium-low','medium-high','hard-low','hard-high'];
const sourceRevision='d8c8ebaee0c08c412cfba96af1923dfa61c83317',hash='a'.repeat(64);
const solution=Array.from({length:81},(_,cell)=>{const row=Math.floor(cell/9),column=cell%9;return String((row*3+Math.floor(row/3)+column)%9+1);}).join('');
function tuple(index=0):any[]{return [index.toString(16).padStart(64,'0'),(index+1000).toString(16).padStart(64,'0'),'a'.repeat(12),'0'.repeat(81),solution,12,0];}
function manifest(patch:Partial<Record<PoolId,number>>={},width=256):any{
  const counts={easy:25000,'medium-low':12500,'medium-high':12500,'hard-low':25000,'hard-high':25000,...patch};
  return {schemaVersion:1,catalogVersion:'1',certificationVersion:'1',selectionVersion:'1',sourceRevision,sourceHashes:{'easy.txt':hash,'medium.txt':hash,'hard.txt':hash},pools:Object.fromEntries(pools.map(pool=>{
    const count=counts[pool],shards=[];for(let start=0;start<count;start+=width)shards.push({path:`${pool}-${start}-${hash.slice(0,16)}.json`,sha256:hash,bytes:1,count:Math.min(width,count-start),start,pool,recordRoot:hash});return [pool,{count,shards}];
  }))};
}
function descriptor(count=1):ShardDescriptor{return {path:`easy-0-${hash.slice(0,16)}.json`,sha256:hash,bytes:1,count,start:0,pool:'easy',recordRoot:hash};}
function shard(records:any[]):any{return {schemaVersion:1,catalogVersion:'1',pool:'easy',start:0,records};}

describe('catalog strict public decoding boundaries',()=>{
  it('rejects each independent manifest version, source field and unknown key',()=>{
    expect(decodeManifest(manifest()).pools.easy.count).toBe(25000);
    for(const key of ['catalogVersion','certificationVersion','selectionVersion','sourceRevision']){const value=manifest();value[key]='other';expect(()=>decodeManifest(value)).toThrow();}
    for(const change of [(value:any)=>value.extra=true,(value:any)=>value.pools.easy.extra=true,(value:any)=>value.pools.easy.shards[0].extra=true,(value:any)=>value.sourceHashes.extra=hash,(value:any)=>delete value.sourceHashes['hard.txt']]){const value=manifest();change(value);expect(()=>decodeManifest(value)).toThrow();}
    for(const field of ['easy.txt','medium.txt','hard.txt'])for(const invalid of ['bad','x'+hash,hash+'x',hash+'\n',new String(hash)]){const value=manifest();value.sourceHashes[field]=invalid;expect(()=>decodeManifest(value)).toThrow();}
    for(const field of ['sha256','recordRoot'])for(const invalid of ['x'+hash,hash+'x',new String(hash)]){const value=manifest();value.pools.easy.shards[0][field]=invalid;expect(()=>decodeManifest(value)).toThrow();}
  });
  it('requires plain objects independently of their enumerable field names',()=>{
    const original=manifest();
    for(const candidate of [Object.assign(Object.create(null),original),Object.assign(Object.create({inherited:true}),original),Object.setPrototypeOf(Object.assign([],original),Object.prototype),Object.setPrototypeOf(Object.assign(()=>{},original),Object.prototype)])expect(()=>decodeManifest(candidate)).toThrow();
    const withArray=manifest();withArray.pools.easy.shards[0]=Object.assign([],withArray.pools.easy.shards[0]);expect(()=>decodeManifest(withArray)).toThrow();
    const value=shard([tuple()]);value.extra=true;expect(()=>decodeShard(value,descriptor())).toThrow();
    const prototype=Object.assign(Object.create({inherited:true}),shard([tuple()]));expect(()=>decodeShard(prototype,descriptor())).toThrow();
  });
  it('isolates interval quotas, band quotas and numeric budgets',()=>{
    for(const counts of [{easy:24999,'medium-low':12501},{'medium-low':12499,'hard-low':25001},{'hard-low':24999,easy:25001}])expect(()=>decodeManifest(manifest(counts))).toThrow();
    expect(()=>decodeManifest(manifest({'medium-low':999,'medium-high':24001}))).toThrow();
    expect(()=>decodeManifest(manifest({easy:1000001}))).toThrow();
    expect(()=>decodeManifest(manifest({easy:25000.5}))).toThrow();
    for(const bytes of [0,-1,1.5,98305,Infinity,'1']){const value=manifest();value.pools.easy.shards[0].bytes=bytes;expect(()=>decodeManifest(value)).toThrow();}
    const upper=manifest();upper.pools.easy.shards[0].bytes=98304;expect(()=>decodeManifest(upper)).not.toThrow();
    const misplaced=manifest();misplaced.pools.easy.shards[1].start++;misplaced.pools.easy.shards[1].path=`easy-${misplaced.pools.easy.shards[1].start}-${hash.slice(0,16)}.json`;expect(()=>decodeManifest(misplaced)).toThrow();
    const wrongPool=manifest();wrongPool.pools.easy.shards[0].pool='medium-low';expect(()=>decodeManifest(wrongPool)).toThrow();
    const wrongCount=manifest();wrongCount.pools.easy.shards[0].count--;expect(()=>decodeManifest(wrongCount)).toThrow();
  });
  it('enforces dense arrays and both inclusive list limits without invoking caller iteration',()=>{
    const records=Array.from({length:256},(_,index)=>tuple(index));expect(decodeShard(shard(records),descriptor(256))).toHaveLength(256);
    expect(()=>decodeShard(shard([...records,tuple(256)]),descriptor(257))).toThrow();
    const hidden=tuple();Object.defineProperty(hidden,'0',{value:hidden[0],enumerable:false});expect(()=>decodeTuple(hidden,'easy')).toThrow();
    const hiddenRecords=[tuple()];Object.defineProperty(hiddenRecords,'0',{value:hiddenRecords[0],enumerable:false});expect(()=>decodeShard(shard(hiddenRecords),descriptor())).toThrow();
    const arrayLike={...tuple(),length:7};expect(()=>decodeTuple(arrayLike,'easy')).toThrow();
    const max=manifest({easy:1000000},200);expect(max.pools.easy.shards).toHaveLength(5000);expect(()=>decodeManifest(max)).not.toThrow();
    const excessive=manifest({easy:25005},5);expect(excessive.pools.easy.shards).toHaveLength(5001);expect(()=>decodeManifest(excessive)).toThrow();
    const concealed=manifest();Object.defineProperty(concealed.pools.easy.shards,'0',{value:concealed.pools.easy.shards[0],enumerable:false});expect(()=>decodeManifest(concealed)).toThrow();
  });
  it('requires primitive tuple fields and exact transport lengths before structural Sudoku acceptance',()=>{
    expect(decodeTuple(tuple(),'easy').solution).toBe(solution);
    expect(()=>decodeTuple([...tuple(),0],'easy')).toThrow();
    for(const index of [0,1,2,3,4]){const value=tuple();value[index]=new String(value[index]);expect(()=>decodeTuple(value,'easy')).toThrow();}
    for(const index of [0,1,2])for(const decoration of ['prefix','suffix','newline']){const value=tuple();value[index]=decoration==='prefix'?'x'+value[index]:value[index]+(decoration==='suffix'?'x':'\n');expect(()=>decodeTuple(value,'easy')).toThrow();}
    for(const index of [3,4]){const value=tuple();value[index]+=value[index];expect(()=>decodeTuple(value,'easy')).toThrow();}
    const wrongVersion=shard([tuple()]);wrongVersion.catalogVersion='2';expect(()=>decodeShard(wrongVersion,descriptor())).toThrow();
  });
  it('rejects duplicate concrete identities even when equivalence groups differ',()=>{
    const first=tuple(1),second=tuple(2);second[0]=first[0];expect(()=>decodeShard(shard([first,second]),descriptor(2))).toThrow();
    const a=tuple(3),b=tuple(4);b[1]=a[1];expect(()=>decodeShard(shard([a,b]),descriptor(2))).toThrow();
  });
  it('checks the final row in each column independently of row and box structure',()=>{
    const digits=[...solution];[digits[73],digits[74]]=[digits[74],digits[73]];
    const rows=Array.from({length:9},(_,row)=>digits.slice(row*9,row*9+9));
    const columns=Array.from({length:9},(_,column)=>Array.from({length:9},(_,row)=>digits[row*9+column]));
    const boxes=Array.from({length:9},(_,box)=>Array.from({length:9},(_,offset)=>digits[(Math.floor(box/3)*3+Math.floor(offset/3))*9+(box%3)*3+offset%3]));
    expect(rows.filter(row=>new Set(row).size!==9)).toHaveLength(0);expect(columns.filter(column=>new Set(column).size!==9)).toHaveLength(2);expect(boxes.filter(box=>new Set(box).size!==9)).toHaveLength(0);
    const value=tuple();value[4]=digits.join('');expect(()=>decodeTuple(value,'easy')).toThrow();
  });
});
