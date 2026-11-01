import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from './server.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const root = resolve(process.argv[2] ?? 'dist');
const evidence = resolve('prototypes/pwa-validation/store-native', String(Date.now()));
await mkdir(evidence, { recursive: true });
const host = await staticHost({ root, port: 5199 });
const resumedFrom = process.argv[3] === '--resume' ? resolve(process.argv[4]) : undefined;
const profile = resumedFrom ? resolve(resumedFrom, 'profile') : resolve(evidence, 'profile'), url = host.origin + '/toadoku/';
const essentialName = 'toadodu:' + encodeURIComponent('/toadoku/'), offlineName = essentialName + ':offline-v1';
const log = { root, resumedFrom, build: JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8')).buildId, events: [], requests: host.state.requests };
let context, page;
const mark = (name, data = {}) => { const entry = { name, ...data }; log.events.push(entry); console.log(JSON.stringify(entry)); };
async function launch() {
  context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 360, height: 800 } });
  page = context.pages()[0]; page.setDefaultTimeout(20_000);
  await page.goto(url); await expect(page.locator('.menu-more')).toBeEnabled();
  log.browser = context.browser().version();
}
async function closeDialogs() {
  for (let depth = 0; depth < 6 && await page.getByRole('dialog').count(); depth++) await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
}
async function mainMenu() {
  await closeDialogs();
  if (await page.locator('.dock .more').count()) {
    await page.locator('.dock .more').click();
    await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  }
  await expect(page.locator('.menu-more')).toBeEnabled();
}
async function panel() {
  if (await page.getByRole('heading', { name: 'Install and offline', exact: true }).count()) return;
  await mainMenu(); await page.locator('.menu-more').click();
  await page.getByRole('button', { name: 'Install and offline', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Upcoming puzzles at last check', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prepare offline play', exact: true })).toBeEnabled({ timeout: 40_000 });
}
async function inspect() {
  await page.getByRole('button', { name: 'Check saved puzzles', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check saved puzzles', exact: true })).toBeEnabled({ timeout: 40_000 });
}
async function counts() { return (await page.locator('.pwa-pane dl').first().locator('dd').allTextContents()).map(Number); }
async function prepare(failure = false) {
  const requestStart = host.state.requests.length, started = performance.now();
  await panel();
  await page.getByRole('button', { name: 'Prepare offline play', exact: true }).click();
  if (failure) await expect(page.getByRole('alert')).toContainText('Preparation could not finish', { timeout: 60_000 });
  else await expect(page.getByText('Puzzle reserve verified.', { exact: true })).toBeVisible({ timeout: 180_000 });
  await expect(page.getByRole('button', { name: 'Prepare offline play', exact: true })).toBeEnabled({ timeout: 40_000 });
  const requests = host.state.requests.slice(requestStart);
  return { ms: performance.now() - started, encodedBodyBytes: requests.reduce((sum,item)=>sum+item.sentBodyBytes,0),
    logicalResponseBytes: requests.reduce((sum,item)=>sum+item.logicalBytes,0), requests };
}
async function profileDisk() {
  const totals = { indexedDBFileBytes: 0, cacheStorageFileBytes: 0, indexedDBFiles: 0, cacheStorageFiles: 0 };
  async function walk(directory) {
    for (const entry of await readdir(directory,{withFileTypes:true})) {
      const path=resolve(directory,entry.name);
      if(entry.isDirectory())await walk(path);
      else if(entry.isFile()){
        const name=path.replaceAll('\\','/'), size=(await stat(path)).size;
        if(name.includes('/IndexedDB/')){totals.indexedDBFileBytes+=size;totals.indexedDBFiles++;}
        if(name.includes('/CacheStorage/')){totals.cacheStorageFileBytes+=size;totals.cacheStorageFiles++;}
      }
    }
  }
  await walk(profile);
  return { ...totals, attribution: 'Closed isolated Chromium profile; includes database/browser overhead and obsolete LSM bytes pending compaction. IndexedDB combines essential, compact and recent-file stores; no exact per-store disk attribution.' };
}
async function native(name, mode, argument) {
  return page.evaluate(async ({ essentialName, offlineName, name, mode, argument }) => {
    const requestedName = name === 'essential' ? essentialName : offlineName;
    const db = await new Promise((done, fail) => { const request = indexedDB.open(requestedName); request.onsuccess = () => done(request.result); request.onerror = () => fail(request.error); });
    try {
      const essentialStores = ['meta','settings','profile','roles','attempts','pools','issued','issuedBuckets','receipts','receiptBuckets','grants','intents'];
      if (mode === 'snapshot') return await new Promise((done, fail) => {
        const stores = essentialStores.filter(store => db.objectStoreNames.contains(store)), tx = db.transaction(stores, 'readonly'), data = {};
        for (const store of stores) { const request = tx.objectStore(store).getAll(); request.onsuccess = () => data[store] = request.result; }
        tx.oncomplete = () => done(data); tx.onabort = () => fail(tx.error);
      });
      if (mode === 'inventory') return await new Promise((done, fail) => {
        const tx = db.transaction(['records','meta'], 'readonly'), values = tx.objectStore('records').getAll(), keys = tx.objectStore('records').getAllKeys(), metadata = tx.objectStore('meta').get('manifest');
        tx.oncomplete = () => done({ count: values.result.length, bytes: values.result.reduce((sum, row) => sum + new TextEncoder().encode(row.json).length, 0),
          sample: values.result[0]?.json, keys: keys.result, manifestBytes: metadata.result?.byteLength });
        tx.onabort = () => fail(tx.error);
      });
      if (mode === 'recent-inventory') return await new Promise((done,fail)=>{
        const tx=db.transaction('cache','readonly'), request=tx.objectStore('cache').getAll();
        tx.oncomplete=()=>done({shards:request.result.length,logicalShardBytes:request.result.reduce((sum,row)=>sum+(row.bytes?.byteLength??0),0)});
        tx.onabort=()=>fail(tx.error);
      });
      if (mode === 'seed') return await new Promise((done, fail) => {
        const tx = db.transaction(['records','meta'], 'readwrite'), records = tx.objectStore('records');
        records.clear();
        const json = argument.padding ? argument.json + ' '.repeat(argument.padding - new TextEncoder().encode(argument.json).length) : argument.json;
        for (let index = 0; index < argument.count; index++) records.put({ json }, 'fault:' + index);
        const revision = tx.objectStore('meta').get('clear-revision');
        revision.onsuccess = () => tx.objectStore('meta').put((revision.result ?? 0) + 1, 'clear-revision');
        tx.oncomplete = () => done({ count: argument.count, bytes: argument.count * new TextEncoder().encode(json).length });
        tx.onabort = () => fail(tx.error);
      });
      if (mode === 'corrupt') return await new Promise((done, fail) => {
        const tx = db.transaction('records','readwrite'), store = tx.objectStore('records'), request = store.get(argument.key);
        request.onsuccess = () => {
          if (!request.result) { tx.abort(); return; }
          const record = JSON.parse(request.result.json);
          if (argument.kind === 'extra') record.extra = 'unexpected';
          else { delete record.extra; record.attestation.recordSiblings[0] = '0'.repeat(64); }
          store.put({ json: JSON.stringify(record) }, argument.key);
        };
        tx.oncomplete = () => done(true); tx.onabort = () => fail(Error('Corruption fixture could not find prepared record'));
      });
      if (mode === 'clear-recent') return await new Promise((done, fail) => {
        const tx = db.transaction('cache','readwrite'); tx.objectStore('cache').clear(); tx.oncomplete = () => done(true); tx.onabort = () => fail(tx.error);
      });
      throw Error('unknown native operation');
    } finally { db.close(); }
  }, { essentialName, offlineName, name, mode, argument });
}
function current(save) { return save.meta.find(value => typeof value.generation === 'string' && Number.isInteger(value.essentialRevision)); }
function expectedOrdinal(state, attempts) {
  let cursor = state.cursor, epoch = state.epoch, order;
  const excluded = new Set(attempts.filter(item => item.definition.pool === state.pool).map(item => item.definition.attestation.shardStart + item.definition.attestation.recordIndex));
  if (state.lastOrdinal !== undefined) excluded.add(state.lastOrdinal);
  const shuffle = () => {
    let random = (state.seed ^ Math.imul(epoch, 0x9e3779b9)) >>> 0;
    const random32 = () => random = (Math.imul(1664525, random) + 1013904223) >>> 0;
    const values = Array.from({ length: state.count }, (_, index) => index);
    for (let end = values.length - 1; end > 0; end--) {
      const bound = end + 1, limit = Math.floor(4294967296 / bound) * bound;
      let value; do { value = random32(); } while (value >= limit);
      const other = value % bound, saved = values[end]; values[end] = values[other]; values[other] = saved;
    }
    return values;
  };
  order = shuffle();
  for (let step = 0; step < state.count * 2; step++) {
    if (cursor === state.count) { cursor = 0; epoch++; order = shuffle(); }
    const ordinal = order[cursor++]; if (!excluded.has(ordinal)) return ordinal;
  }
  throw Error('reference exhausted');
}
async function startEasy() {
  await mainMenu(); await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect.poll(async () => await page.locator('.cell').count() === 81 || await page.getByRole('button', { name: 'Replace puzzle', exact: true }).count() > 0).toBe(true);
  if (await page.getByRole('button', { name: 'Replace puzzle', exact: true }).count()) await page.getByRole('button', { name: 'Replace puzzle', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
}
try {
  let next;
  if (!resumedFrom) {
  await launch();
  const originBefore=await page.evaluate(()=>navigator.storage.estimate());
  const defaultCosts=await prepare();
  const original = await native('offline','inventory');
  assert.equal(original.count,15); assert(original.bytes < 1024 * 1024); assert.equal(original.manifestBytes,127753);
  mark('real-default-inventory',{ count:original.count, recordJsonBytes:original.bytes, manifestBytes:original.manifestBytes,
    originWideBefore:originBefore,originWideAfter:await page.evaluate(()=>navigator.storage.estimate()),
    recentFiles:await native('essential','recent-inventory'), download:defaultCosts });
  await context.close();context=undefined;mark('closed-default-profile-files',await profileDisk());
  await launch();await panel();

  const countSeed = await native('offline','seed',{json:original.sample,count:512});
  assert(countSeed.bytes < 1024 * 1024,'Count-limit fixture must remain below the byte limit');
  await native('essential','clear-recent');
  await context.close(); context=undefined; await launch();
  const before = await native('essential','snapshot'), meta=current(before), pool=before.pools.find(item=>item.generation===meta.generation&&item.pool==='easy');
  const wanted=expectedOrdinal(pool,before.attempts.filter(item=>item.generation===meta.generation)), requestStart=host.state.requests.length;
  await startEasy();
  const after=await native('essential','snapshot'), allocated=after.attempts.find(item=>item.generation===current(after).generation&&item.role==='quick');
  assert.equal(allocated.definition.attestation.shardStart+allocated.definition.attestation.recordIndex,wanted);
  await mainMenu(); const full=await native('offline','inventory');
  assert.equal(full.count,512); assert(full.bytes<=1024*1024);
  const demandedRequests=host.state.requests.slice(requestStart).filter(item=>/catalog\/v1\/.*\.json$/.test(item.path));
  assert(demandedRequests.length>0,'Exact demanded puzzle must be fetched after recent-file and memory caches were cleared');
  mark('count-cap-online-demand',{seed:countSeed,kept:full.count,wanted,requested:allocated.definition.id,requests:demandedRequests});

  await panel();
  const pausedBefore=await native('essential','snapshot');
  await page.getByRole('button',{name:'Remove extra puzzles',exact:true}).click();
  await expect.poll(async()=> (await native('offline','inventory')).count).toBe(0);
  await expect(page.getByRole('button',{name:'Prepare offline play',exact:true})).toBeEnabled({timeout:40000});
  assert.deepEqual(await native('essential','snapshot'),pausedBefore);
  mark('remove-preserves-essentials',{counts:await counts()});

  const byteSeed=await native('offline','seed',{json:original.sample,count:256,padding:4090});
  assert(byteSeed.bytes<1024*1024);
  await prepare(true);
  const bytesFull=await native('offline','inventory');
  assert.equal(bytesFull.count,256); assert.equal(bytesFull.bytes,byteSeed.bytes);
  assert((await counts()).every(count=>count===0));
  mark('byte-cap-refuses-pack',{seed:byteSeed,counts:await counts()});

  await page.getByRole('button',{name:'Remove extra puzzles',exact:true}).click();
  await expect.poll(async()=> (await native('offline','inventory')).count).toBe(0);
  await prepare();
  const activeSave=await native('essential','snapshot'), generation=current(activeSave).generation, state=activeSave.pools.find(item=>item.generation===generation&&item.pool==='easy');
  next=expectedOrdinal(state,activeSave.attempts.filter(item=>item.generation===generation)); const key='easy:'+next;
  await native('offline','corrupt',{key,kind:'extra'}); await inspect();
  assert.equal((await counts())[0],0);
  mark('strict-extra-rejected',{key,counts:await counts()});
  await native('offline','corrupt',{key,kind:'proof'}); await inspect();
  assert.equal((await counts())[0],0);
  } else {
    await launch();
    const save=await native('essential','snapshot'), generation=current(save).generation;
    next=expectedOrdinal(save.pools.find(item=>item.generation===generation&&item.pool==='easy'),save.attempts.filter(item=>item.generation===generation));
    mark('resumed-correct-replacement-dialog-tail',{from:resumedFrom,next});
  }
  await native('essential','clear-recent'); await context.close(); context=undefined; await launch(); await startEasy();
  const repaired=await native('essential','snapshot'), repairedAttempt=repaired.attempts.find(item=>item.generation===current(repaired).generation&&item.role==='quick');
  assert.equal(repairedAttempt.definition.attestation.shardStart+repairedAttempt.definition.attestation.recordIndex,next);
  mark('corrupt-proof-online-exact-recovery',{expected:next,actual:repairedAttempt.definition.attestation.shardStart+repairedAttempt.definition.attestation.recordIndex});
  await panel();

  for(const fault of ['quota','abort']) {
    const remove=page.getByRole('button',{name:'Remove extra puzzles',exact:true});
    if(await remove.isEnabled())await remove.click();
    await expect.poll(async()=> (await native('offline','inventory')).count).toBe(0);
    const unchanged=await native('essential','snapshot');
    await page.evaluate(({offlineName,fault})=>{
      const original=IDBDatabase.prototype.transaction;
      window.__restoreOfflineFault=()=>{IDBDatabase.prototype.transaction=original;};
      IDBDatabase.prototype.transaction=function(stores,mode,...options){
        const selected=typeof stores==='string'?[stores]:Array.from(stores);
        if(this.name===offlineName&&mode==='readwrite'&&selected.includes('records')){
          if(fault==='quota')throw new DOMException('Synthetic test quota rejection','QuotaExceededError');
          const transaction=Reflect.apply(original,this,[stores,mode,...options]);queueMicrotask(()=>transaction.abort());return transaction;
        }
        return Reflect.apply(original,this,[stores,mode,...options]);
      };
    },{offlineName,fault});
    await prepare(true);
    await page.evaluate(()=>{window.__restoreOfflineFault();delete window.__restoreOfflineFault;});
    assert.equal((await native('offline','inventory')).count,0);
    assert((await counts()).every(count=>count===0));
    assert.deepEqual(await native('essential','snapshot'),unchanged);
    mark('synthetic-'+fault+'-no-false-readiness',{counts:await counts(),naturalQuota:false});
  }
  log.passed=true;
} catch(error) {
  log.error=String(error); if(page){log.failureText=await page.locator('body').innerText().catch(()=>undefined);await page.screenshot({path:resolve(evidence,'failure.png')}).catch(()=>{});} throw error;
} finally {
  if(context)await context.close();
  log.finalClosedProfileFiles=await profileDisk();
  await host.close();
  await writeFile(resolve(evidence,'report.json'),JSON.stringify(log,null,2));
  console.log(JSON.stringify({evidence,passed:log.passed??false}));
}
