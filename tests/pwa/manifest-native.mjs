import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { staticHost } from './server.mjs';
import { decodeManifest } from '../../src/lib/catalog/decode.ts';
import { manifestMembership } from '../../src/lib/catalog/attestation.ts';
const canonicalBytes = await readFile('public/catalog/v1/manifest.json');
const poisoned = JSON.parse(canonicalBytes.toString('utf8'));
poisoned.pools.easy.shards[0].sha256 = '0'.repeat(64);
poisoned.pools.easy.shards[0].path = 'easy-0-0000000000000000.json';
assert(decodeManifest(poisoned)); assert(await manifestMembership(poisoned));
const canonicalSha = createHash('sha256').update(canonicalBytes).digest('hex');
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const root=resolve(process.argv[2]??'dist'),evidence=resolve('prototypes/pwa-validation/manifest-native',String(Date.now()));
await mkdir(evidence,{recursive:true});
const host=await staticHost({root,port:5199}),profile=resolve(evidence,'profile'),url=host.origin+'/toadoku/';
const essential='toadodu:'+encodeURIComponent('/toadoku/'),offline=essential+':offline-v1';
const report={root,build:JSON.parse(await readFile(resolve(root,'release.json'),'utf8')).buildId,canonicalSha,oldSchemaAcceptsPoison:true,oldMembershipAcceptsPoison:true,events:[],requests:host.state.requests};
let context,page;
const mark=(name,data={})=>{const entry={name,...data};report.events.push(entry);console.log(JSON.stringify(entry));};
async function launch(disconnected=false){
  context=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:360,height:800}});
  await context.setOffline(disconnected);page=context.pages()[0];page.setDefaultTimeout(20000);
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.menu-more')).toBeEnabled();
  report.browser=context.browser().version();
  mark('launch',{offline:disconnected,fromServiceWorker:response.fromServiceWorker()});
}
async function snapshot(){
 return page.evaluate(async name=>{
  const db=await new Promise((done,fail)=>{const request=indexedDB.open(name);request.onsuccess=()=>done(request.result);request.onerror=()=>fail(request.error);});
  try{return await new Promise((done,fail)=>{
   const tx=db.transaction(['meta','profile','attempts','pools'],'readonly'),data={};
   for(const name of ['profile','attempts','pools']){const request=tx.objectStore(name).getAll();request.onsuccess=()=>data[name]=request.result;}
   const current=tx.objectStore('meta').get('current');current.onsuccess=()=>data.current=current.result;
   tx.oncomplete=()=>done(data);tx.onabort=()=>fail(tx.error);
  });}finally{db.close();}
 },essential);
}
function attempt(save,role){return save.attempts.find(item=>item.generation===save.current.generation&&item.role===role);}
function wallet(save){return save.profile.find(item=>item.generation===save.current.generation).wallet;}
async function closeDialogs(){for(let n=0;n<8&&await page.getByRole('dialog').count();n++)await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();}
async function menu(){
 await closeDialogs();if(await page.locator('.dock .more').count()){await page.locator('.dock .more').click();await page.getByRole('button',{name:'Main menu',exact:true}).click();}
 await expect(page.locator('.menu-more')).toBeEnabled();
}
async function panel(){
 await menu();await page.locator('.menu-more').click();await page.getByRole('button',{name:'Install and offline',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Upcoming puzzles at last check',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Check saved puzzles',exact:true})).toBeEnabled({timeout:40000});
}
async function quick(){
 await menu();await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Easy',exact:true}).click();
 await expect.poll(async()=>await page.locator('.cell').count()===81||await page.getByRole('button',{name:'Replace puzzle',exact:true}).count()>0).toBe(true);
 if(await page.getByRole('button',{name:'Replace puzzle',exact:true}).count())await page.getByRole('button',{name:'Replace puzzle',exact:true}).click();
 await expect(page.locator('.cell')).toHaveCount(81);
}
function preferred(state,attempts){
 let random=(state.seed^Math.imul(state.epoch,0x9e3779b9))>>>0;
 const draw=()=>random=(Math.imul(1664525,random)+1013904223)>>>0;
 const order=Array.from({length:state.count},(_,n)=>n);
 for(let end=order.length-1;end>0;end--){const bound=end+1,limit=Math.floor(4294967296/bound)*bound;let value;do{value=draw();}while(value>=limit);const j=value%bound,tmp=order[end];order[end]=order[j];order[j]=tmp;}
 const blocked=new Set(attempts.filter(a=>a.definition.pool===state.pool).map(a=>a.definition.attestation.shardStart+a.definition.attestation.recordIndex));blocked.add(state.lastOrdinal);
 for(let cursor=state.cursor;cursor<state.count;cursor++)if(!blocked.has(order[cursor]))return order[cursor];
 throw Error('This focused fixture unexpectedly reached a traversal wrap');
}
async function metadataSha(){
 const bytes=await page.evaluate(async name=>{
  const db=await new Promise((done,fail)=>{const r=indexedDB.open(name);r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});
  try{return await new Promise((done,fail)=>{const tx=db.transaction('meta','readonly'),r=tx.objectStore('meta').get('manifest');tx.oncomplete=()=>done(Array.from(r.result??[]));tx.onabort=()=>fail(tx.error);});}finally{db.close();}
 },offline);
 return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}
function preserved(save,original){
 const restored=attempt(save,'frontier');
 for(const field of ['id','definition','entries','notes','notesMode','selection','undo','assistance'])assert.deepEqual(restored[field],original[field],field);
}
try{
 await launch();
 await page.getByRole('button',{name:'Progression',exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);
 let saved=await snapshot(),frontier=attempt(saved,'frontier'),blank=[...frontier.definition.givens].findIndex(v=>v==='0');
 await page.locator('[data-cell="'+blank+'"]').press(frontier.definition.solution[blank]);await expect.poll(async()=>attempt(await snapshot(),'frontier').entries[blank]).toBe(Number(frontier.definition.solution[blank]));
 await panel();await page.getByRole('button',{name:'Prepare offline play',exact:true}).click();await expect(page.getByText('Puzzle reserve verified.',{exact:true})).toBeVisible({timeout:180000});await expect(page.getByRole('button',{name:'Check saved puzzles',exact:true})).toBeEnabled({timeout:40000});
 await menu();saved=await snapshot();frontier=attempt(saved,'frontier');const savedWallet=wallet(saved);
 await page.evaluate(async({name,text})=>{
  const db=await new Promise((done,fail)=>{const r=indexedDB.open(name);r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});
  try{await new Promise((done,fail)=>{const tx=db.transaction('meta','readwrite');tx.objectStore('meta').put(new TextEncoder().encode(text),'manifest');tx.oncomplete=done;tx.onabort=()=>fail(tx.error);});}finally{db.close();}
 },{name:offline,text:JSON.stringify(poisoned)});
 assert.notEqual(await metadataSha(),canonicalSha);
 await context.close();context=undefined;host.state.offline=true;
 await launch(true);preserved(await snapshot(),frontier);assert.equal(wallet(await snapshot()),savedWallet);
 await panel();
 await expect.poll(async()=>await page.locator('.pwa-pane dl').first().locator('dd').allTextContents()).toEqual(['0','0','0']);
 assert.notEqual(await metadataSha(),canonicalSha);
 mark('poisoned-manifest-cold-offline-honest',{counts:[0,0,0],frontier:frontier.id,wallet:savedWallet});
 await context.close();context=undefined;host.state.offline=false;
 await launch();const before=await snapshot(),state=before.pools.find(p=>p.generation===before.current.generation&&p.pool==='easy'),expected=preferred(state,before.attempts.filter(a=>a.generation===before.current.generation)),requestStart=host.state.requests.length;
 await quick();const repaired=await snapshot(),fresh=attempt(repaired,'quick');
 assert.equal(fresh.definition.attestation.shardStart+fresh.definition.attestation.recordIndex,expected);preserved(repaired,frontier);assert.equal(wallet(repaired),savedWallet);
 await expect.poll(metadataSha).toBe(canonicalSha);
 const requests=host.state.requests.slice(requestStart);
 assert.equal(requests.filter(r=>r.path.endsWith('/catalog/v1/manifest.json')).length,1);
 assert(!requests.some(r=>r.path.includes('0000000000000000')));
 mark('online-demand-repairs-canonical-metadata',{expected,actual:fresh.definition.attestation.shardStart+fresh.definition.attestation.recordIndex,requests});
 await menu();await context.close();context=undefined;host.state.offline=true;
 await launch(true);const cold=await snapshot();preserved(cold,frontier);assert.equal(wallet(cold),savedWallet);
 const pool=cold.pools.find(p=>p.generation===cold.current.generation&&p.pool==='easy'),next=preferred(pool,cold.attempts.filter(a=>a.generation===cold.current.generation));
 await quick();const result=await snapshot(),replacement=attempt(result,'quick');
 assert.equal(replacement.definition.attestation.shardStart+replacement.definition.attestation.recordIndex,next);preserved(result,frontier);assert.equal(wallet(result),savedWallet);
 mark('repaired-metadata-next-cold-offline-allocation',{expected:next,actual:replacement.definition.attestation.shardStart+replacement.definition.attestation.recordIndex,frontier:frontier.id,wallet:savedWallet});
 report.passed=true;
}catch(error){report.error=String(error);if(page){report.failureText=await page.locator('body').innerText().catch(()=>undefined);await page.screenshot({path:resolve(evidence,'failure.png')}).catch(()=>{});}throw error;}
finally{if(context)await context.close();await host.close();await writeFile(resolve(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({evidence,passed:report.passed??false}));}
