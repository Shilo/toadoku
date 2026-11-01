import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('prototypes/production-ui-evidence/browsers');
const {chromium,expect}=await import('@playwright/test');
const [mode='offline',rootText='dist',bText,cText]=process.argv.slice(2),root=resolve(rootText);
const runId=mode+'-'+Date.now(),evidence=resolve('prototypes/pwa-validation/journeys',runId);
await mkdir(evidence,{recursive:true});
const profile=['offline-tail','travel-tail','exhaustion-tail'].includes(mode)&&bText?resolve(bText):resolve(evidence,'profile'),host=await staticHost({root,port:5198});
const url=host.origin+'/toadoku/',log={mode,root,runId,events:[],requests:host.state.requests};
let context,page;const cleanups=[];let releaseHTTP=()=>{};
const mark=(name,data={})=>{const entry={name,at:new Date().toISOString(),...data};log.events.push(entry);console.log(JSON.stringify(entry));};
async function launch(offline=false){
 context=await chromium.launchPersistentContext(profile,{headless:true,acceptDownloads:true,viewport:{width:360,height:800},deviceScaleFactor:3});
 if(mode==='polling')await context.addInitScript(()=>{window.__updateCalls=[];const original=ServiceWorkerRegistration.prototype.update;ServiceWorkerRegistration.prototype.update=function(...args){const entry={start:Date.now()};window.__updateCalls.push(entry);return original.apply(this,args).finally(()=>entry.end=Date.now());};});await context.setOffline(offline);page=context.pages()[0];page.setDefaultTimeout(15000);
 const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');cdp.on('ServiceWorker.workerErrorReported',event=>mark('service-worker-error',event));
 context.on('response',response=>{if(/(?:hint|backup|raw-recovery)\.worker/.test(response.url()))mark('feature-worker-response',{url:response.url(),status:response.status(),fromServiceWorker:response.fromServiceWorker()});});
 page.on('pageerror',error=>mark('pageerror',{message:error.message}));
 page.on('console',message=>{if(message.type()==='error')mark('consoleerror',{message:message.text()});});
 log.browserVersion=context.browser().version();
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});
 await expect(page.locator('.menu-more')).toBeEnabled();
 mark('launch',{offline,fromServiceWorker:response.fromServiceWorker(),build:await build()});
}
async function build(){return page.locator('meta[name="toadoku-build"]').getAttribute('content');}
async function shell(which='active'){
 return page.evaluate(async which=>{
  const reg=await navigator.serviceWorker.getRegistration(location.href),worker=reg?.[which];
  if(!worker)return null;
  return new Promise((done,fail)=>{const channel=new MessageChannel(),timer=setTimeout(()=>fail(Error('shell reply timeout')),15000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();done({...e.data,state:worker.state,controller:navigator.serviceWorker.controller?.scriptURL??null});};worker.postMessage({type:'TOADOKU_SHELL_VERIFY',protocol:1},[channel.port2]);});
 },which);
}
async function identity(which='active'){
 return page.evaluate(async which=>{const worker=(await navigator.serviceWorker.getRegistration(location.href))?.[which];if(!worker)return null;return new Promise((done,fail)=>{const channel=new MessageChannel(),timer=setTimeout(()=>fail(Error('identity timeout')),5000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();done(e.data);};worker.postMessage({type:'TOADOKU_SHELL_IDENTITY',protocol:1},[channel.port2]);});},which);
}
async function snapshot(){
 return page.evaluate(async()=>{
  const name='toadodu:'+encodeURIComponent('/toadoku/'),db=await new Promise((done,fail)=>{const r=indexedDB.open(name);r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});
  try{return await new Promise((done,fail)=>{
   const names=['meta','profile','settings','roles','attempts','pools','issued','issuedBuckets','receipts','receiptBuckets'].filter(n=>db.objectStoreNames.contains(n)),tx=db.transaction(names,'readonly'),data={};
   for(const name of names){const r=tx.objectStore(name).getAll();r.onsuccess=()=>data[name]=r.result;}
   const current=tx.objectStore('meta').get('current');current.onsuccess=()=>data.current=current.result;
   tx.oncomplete=()=>done(data);tx.onabort=()=>fail(tx.error);
  });}finally{db.close();}
 });
}
function attempt(save,role){const generation=save.current.generation;return save.attempts.find(a=>a.generation===generation&&a.role===role);}
function profileOf(save){return save.profile.find(p=>p.generation===save.current.generation);}
function receiptsOf(save){const generation=save.current.generation;return [...save.receipts.filter(r=>r.generation===generation).map(r=>r.physicalVersion===1?r.record:r),...save.receiptBuckets.filter(r=>r.generation===generation).flatMap(r=>r.items)];}

async function closeDialogs(){for(let depth=0;depth<8&&await page.getByRole('dialog').count();depth++){await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();}await expect(page.getByRole('dialog')).toHaveCount(0);}
async function more(){await page.locator('.dock .more').click();await expect(page.getByRole('dialog')).toBeVisible();}
async function panel(){
 if(await page.getByRole('heading',{name:'Install and offline',exact:true}).count())return;
 if(await page.locator('.dock .more').count()){await more();await page.getByRole('button',{name:'Settings',exact:true}).click();}
 else await page.locator('.menu-more').click();
 await page.getByRole('button',{name:'Install and offline',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Upcoming puzzles at last check',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Prepare offline play',exact:true})).toBeEnabled({timeout:30000});
}
async function prepare(kind='default'){
 await panel();const before=host.state.requests.length,started=performance.now();
 await page.getByRole('button',{name:kind==='travel'?'Prepare a longer trip':'Prepare offline play',exact:true}).click();
 await Promise.race([expect(page.getByText('Puzzle reserve verified.',{exact:true})).toBeVisible({timeout:180000}),page.getByRole('alert').waitFor({state:'visible',timeout:180000}).then(async()=>{throw Error('Preparation failed: '+await page.locator('.pwa-pane').innerText());})]);
 await expect.poll(async()=> (await shell())?.ready,{timeout:30000}).toBe(true);
 const requests=host.state.requests.slice(before),inventory=await page.evaluate(async()=>{const names=await indexedDB.databases();return {databases:names,caches:await caches.keys(),storage:await navigator.storage.estimate()};});
 mark('prepared',{kind,ms:performance.now()-started,requests,inventory,shell:await shell(),text:await page.locator('.pwa-pane').innerText()});
}
async function resumeQuick(){await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);}
async function solve(role,expectedLeap){
 await expect.poll(async()=>{const current=attempt(await snapshot(),role);return !!current&&current.status==='playing'&&(expectedLeap===undefined||current.binding?.leap===expectedLeap);},{timeout:30000}).toBe(true);await expect(page.locator('.cell')).toHaveCount(81);
 const save=await snapshot(),current=attempt(save,role);assert(current);
 if(current.notesMode)await page.locator('.cell').first().press('n');
 for(let cell=0;cell<81;cell++)if(current.definition.givens[cell]==='0')await page.locator('[data-cell="'+cell+'"]').press(current.definition.solution[cell]);
 await expect(page.getByRole('heading',{name:'Puzzle complete',exact:true})).toBeVisible({timeout:30000});
 await expect.poll(async()=>attempt(await snapshot(),role)?.status).toBe('completed');
 return snapshot();
}
async function offlineFlow(){
 await launch();
 await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Easy',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);
 let save=await snapshot(),current=attempt(save,'quick'),blanks=[...current.definition.givens].map((v,i)=>v==='0'?i:-1).filter(i=>i>=0);
 await page.locator('[data-cell="'+blanks[0]+'"]').press(current.definition.solution[blanks[0]]);
 await page.locator('[data-cell="'+blanks[1]+'"]').press('n');await page.locator('[data-cell="'+blanks[1]+'"]').press('3');
 await expect.poll(async()=>attempt(await snapshot(),'quick')?.notes[blanks[1]]).toBe(4);
 await prepare();
 const beforeClose=attempt(await snapshot(),'quick');mark('saved-before-cold',{attempt:beforeClose});
 await context.close();context=undefined;host.state.offline=true;
 await launch(true);assert.equal(await build(),log.events.find(e=>e.name==='launch').build);
 await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.fonts.check('16px Outfit')&&document.fonts.check('80px Chewy')));await expect.poll(()=>page.locator('.menu-art').evaluate(image=>image.naturalWidth)).toBe(1254);
 const offlineSave=attempt(await snapshot(),'quick');
 for(const key of ['id','entries','notes','notesMode','selection','undo','assistance','elapsedMs'])assert.deepEqual(offlineSave[key],beforeClose[key],key);
 await resumeQuick();
 await more();await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect.poll(async()=>attempt(await snapshot(),'quick')?.notes[blanks[1]]).toBe(0);
 await page.locator('[data-cell="'+blanks[1]+'"]').press('n');
 await more();await page.getByRole('button',{name:'Hint',exact:true}).click();
 await page.getByRole('button',{name:'Find a logical hint',exact:true}).click();
 await expect(page.locator('#hint-result-title')).toBeVisible({timeout:30000});mark('first-offline-hint',{text:await page.getByRole('dialog').innerText()});
 await page.getByRole('button',{name:'Reveal selected answer',exact:true}).click();await expect(page.getByRole('heading',{name:'Selected answer',exact:true})).toBeVisible();mark('first-offline-reveal',{assistance:attempt(await snapshot(),'quick').assistance});
 await offlineTail();
}
async function offlineTail(){
 await closeDialogs();await more();await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByLabel(/^Language/).selectOption('de');
 await expect(page.getByRole('heading',{name:'Einstellungen',exact:true})).toBeVisible();
 await page.getByLabel(/^Sprache/).selectOption('en');
 await page.getByRole('button',{name:'Backup',exact:true}).click();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).click();const backup=await downloaded;
 const path=resolve(evidence,'offline-backup.json');await backup.saveAs(path);const backupBytes=await readFile(path);assert(backupBytes.length>0);
 mark('first-offline-backup',{bytes:backupBytes.length,sha256:createHash('sha256').update(backupBytes).digest('hex')});
 // Exercise the real unopened recovery module worker read-only against the isolated game's DB.
 const release=JSON.parse(await readFile(resolve(root,'release.json'),'utf8')),rawWorker=release.files.find(f=>/raw-recovery.worker-.*\.js$/.test(f.path)).path;
 const recovered=await page.evaluate(async workerPath=>new Promise((done,fail)=>{const worker=new Worker(new URL(workerPath,location.href),{type:'module'}),timer=setTimeout(()=>{worker.terminate();fail(Error('raw recovery timeout'));},30000);worker.onmessage=e=>{clearTimeout(timer);worker.terminate();done({kind:e.data.result.kind,summary:e.data.result.value?.summary});};worker.onerror=e=>{clearTimeout(timer);worker.terminate();fail(Error(e.message));};worker.postMessage({id:1,name:'toadodu:'+encodeURIComponent('/toadoku/')});}),rawWorker);
 assert.equal(recovered.kind,'committed');mark('first-offline-raw-worker',recovered);
 await closeDialogs();
 const completed=await solve('quick'),completedProfile=profileOf(completed);mark('offline-completion',{profile:completedProfile,receiptId:attempt(completed,'quick').receiptId});
 await context.close();context=undefined;await launch(true);
 const reopened=await snapshot();assert.deepEqual(profileOf(reopened),completedProfile);assert.deepEqual(reopened.receipts,completed.receipts);assert.deepEqual(reopened.receiptBuckets,completed.receiptBuckets);
 // Immediately request a new scheduled record after cold menu, before the former two-second cache-attachment delay.
 await page.getByRole('button',{name:'Progression',exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);assert(attempt(await snapshot(),'frontier'));
 mark('cold-offline-next-allocation',{attemptId:attempt(await snapshot(),'frontier').id,serverRequestsWhileOffline:host.state.requests.filter(e=>e.status===0).length});
}
async function adjacentSetup(){
 host.state.fixtures['/neighbor/worker.js']={body:'self.addEventListener("fetch",()=>{});',mime:'text/javascript'};host.state.fixtures['/neighbor/']={body:'<!doctype html><title>Neighbor fixture</title><p>Neighbor fixture</p>',mime:'text/html'};
 await page.evaluate(async()=>{const url=new URL('/neighbor/worker.js',location.href),reg=await navigator.serviceWorker.register(url,{scope:new URL('./',url).href});if(reg.active?.state!=='activated'){const worker=reg.installing??reg.waiting??reg.active;await new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error('Neighbor worker timeout')),10000);const changed=()=>{if(worker.state==='activated'){clearTimeout(timer);done();}};worker.addEventListener('statechange',changed);changed();});}const name='toadoku:pwa:1:%2Fneighbor%2F:'+'a'.repeat(64);await(await caches.open(name)).put(new URL('/neighbor/marker.txt',location.href),new Response('neighbor-kept'));const db=await new Promise((done,fail)=>{const r=indexedDB.open('toadodu:%2Fneighbor%2F',1);r.onupgradeneeded=()=>r.result.createObjectStore('sentinel');r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});try{await new Promise((done,fail)=>{const tx=db.transaction('sentinel','readwrite');tx.objectStore('sentinel').put({value:17},'keep');tx.oncomplete=done;tx.onabort=()=>fail(tx.error);});}finally{db.close();}});
 return adjacentState();
}
async function adjacentState(){return page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration(new URL('/neighbor/',location.href));const cache=await caches.open('toadoku:pwa:1:%2Fneighbor%2F:'+'a'.repeat(64)),marker=await(await cache.match(new URL('/neighbor/marker.txt',location.href))).text();const db=await new Promise((done,fail)=>{const r=indexedDB.open('toadodu:%2Fneighbor%2F');r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});try{const value=await new Promise((done,fail)=>{const tx=db.transaction('sentinel','readonly'),r=tx.objectStore('sentinel').get('keep');tx.oncomplete=()=>done(r.result);tx.onabort=()=>fail(tx.error);});return {scope:reg?.scope,script:reg?.active?.scriptURL,state:reg?.active?.state,marker,value};}finally{db.close();}});}
async function updateFlow(){
 assert(bText&&cText,'Update mode needs A, B and C frozen builds');
 await launch();await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Easy',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);await prepare();
 await context.close();context=undefined;await launch();await resumeQuick();
 await panel();await page.screenshot({path:resolve(evidence,'passing-pwa-panel.png')});const neighborBefore=await adjacentSetup();
 const original=await build(),other=await context.newPage();await other.goto(url);await expect(other.locator('.menu-more')).toBeEnabled();await other.getByRole('button',{name:'Progression',exact:true}).click();await other.getByRole('button',{name:'Start',exact:true}).click();await expect(other.locator('.cell')).toHaveCount(81);
 const otherBlank=other.locator('[data-clue="false"]').first(),dirtyCell=Number(await otherBlank.getAttribute('data-cell')),dirtyDigit=Number(attempt(await snapshot(),'frontier').definition.solution[dirtyCell]);
 const savedBeforeDirty=await snapshot();await other.evaluate(async()=>{const db=await new Promise((done,fail)=>{const r=indexedDB.open('toadodu:'+encodeURIComponent('/toadoku/'));r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});window.__releaseHeldSave=false;window.__heldSaveDb=db;const tx=db.transaction('attempts','readwrite'),store=tx.objectStore('attempts');function keepAlive(){const r=store.get('__pwa_save_gate__');r.onsuccess=()=>{if(!window.__releaseHeldSave)keepAlive();};}keepAlive();tx.oncomplete=()=>db.close();});
 cleanups.push(()=>other.evaluate(()=>window.__releaseHeldSave=true).catch(()=>{}));await otherBlank.press(String(dirtyDigit));await other.locator('.dock .more').click();await expect(other.getByText('SavingÃ¢â‚¬Â¦',{exact:true})).toBeVisible();
 const snapshotBefore=savedBeforeDirty,b=resolve(bText),c=resolve(cText),bInventory=JSON.parse(await readFile(resolve(b,'release.json'),'utf8')),bad=bInventory.files.find(f=>f.path==='index.html');
 host.state.root=b;host.state.fault=pathname=>pathname.endsWith('/'+bad.path)?{status:404}:undefined;
 await panel();await page.getByRole('button',{name:'Check for updates',exact:true}).click();
 await expect(page.getByText('Update check or download failed. Your current app and saved progress are kept.',{exact:true})).toBeVisible({timeout:30000});
 assert.equal(await build(),original);assert.equal((await shell()).buildId,original);mark('failed-B-preserves-A',{shell:await shell(),otherSaving:await other.getByText('SavingÃ¢â‚¬Â¦',{exact:true}).isVisible()});await other.evaluate(()=>window.__releaseHeldSave=true);await expect.poll(async()=>attempt(await snapshot(),'frontier')?.entries[dirtyCell]).toBe(dirtyDigit);await other.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
 host.state.fault=undefined;await page.getByRole('button',{name:'Check for updates',exact:true}).click();
 await expect.poll(async()=> (await shell('waiting'))?.ready,{timeout:30000}).toBe(true);
 const waitingB=await shell('waiting');assert.equal(waitingB.buildId,bInventory.buildId);assert.equal(await build(),original);mark('B-waiting',{waitingB});
 const otherCDP=await context.newCDPSession(other);await otherCDP.send('Page.setWebLifecycleState',{state:'frozen'});cleanups.push(()=>otherCDP.send('Page.setWebLifecycleState',{state:'active'}).catch(()=>{}));mark('second-tab-frozen',{method:'CDP lifecycle simulation, not Android hardware'});
 await page.bringToFront();const discoveryStart=performance.now();host.state.root=c;
 const cInventory=JSON.parse(await readFile(resolve(c,'release.json'),'utf8'));
 await expect.poll(async()=> (await identity('waiting'))?.buildId,{timeout:75000,intervals:[500,1000,2000]}).toBe(cInventory.buildId);
 const discoveryMs=performance.now()-discoveryStart;assert(discoveryMs<=75000);mark('automatic-visible-C-discovery',{discoveryMs,fullReadback:await shell('waiting')});
 assert.equal((await identity()).buildId,original);assert.deepEqual(await adjacentState(),neighborBefore);
 await closeDialogs();await more();await page.getByRole('button',{name:'Hint',exact:true}).click();await page.getByRole('button',{name:'Find a logical hint',exact:true}).click();await expect(page.locator('#hint-result-title')).toBeVisible();
 assert.equal(await build(),original);mark('A-lazy-after-C',{active:await shell(),waiting:await shell('waiting')});
 await page.close();const probe=await context.newPage();await probe.goto(host.origin+'/neighbor/');const isolated=await probe.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration(new URL('/toadoku/',location.href));return {active:reg?.active?.state,waiting:reg?.waiting?.state};});assert.equal(isolated.waiting,'installed');assert.equal(isolated.active,'activated');mark('frozen-old-client-blocks-activation',{onlyRemainingMainClient:'frozen second tab',registration:isolated});await otherCDP.send('Page.setWebLifecycleState',{state:'active'});
 await context.close();context=undefined;await launch();
 assert.equal(await build(),cInventory.buildId);const saveC=await snapshot();assert.equal(attempt(saveC,'quick').id,attempt(snapshotBefore,'quick').id);assert.equal(profileOf(saveC).wallet,profileOf(snapshotBefore).wallet);assert.equal(attempt(saveC,'frontier').entries[dirtyCell],dirtyDigit);assert.deepEqual(await adjacentState(),neighborBefore);mark('C-activated-after-all-close',{shell:await shell(),dirtyDigitPreserved:true,neighbor:await adjacentState()});
 // Compatible rollback is another waiting update, never a save reset.
 host.state.root=root;await panel();await page.getByRole('button',{name:'Check for updates',exact:true}).click();
 await expect.poll(async()=> (await shell('waiting'))?.buildId,{timeout:30000}).toBe(original);
 await context.close();context=undefined;await launch();assert.equal(await build(),original);assert.equal(attempt(await snapshot(),'quick').id,attempt(snapshotBefore,'quick').id);
 const missing=await page.evaluate(async()=>{const r=await fetch('assets/missing-qa.js');return {status:r.status,type:r.headers.get('content-type'),text:await r.text()};});assert.equal(missing.status,404);assert(!missing.text.includes('<html'));assert.deepEqual(await adjacentState(),neighborBefore);mark('rollback-A',{shell:await shell(),missing,neighbor:await adjacentState()});
}
async function pollingFlow(){
 assert(bText,'Polling mode needs target B');await launch();await prepare();await context.close();context=undefined;await launch();await panel();await page.getByRole('button',{name:'Check for updates',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.__updateCalls.length>0&&window.__updateCalls.every(c=>c.end))).toBe(true);await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.installing)).toBe(false);
 const callsBefore=await page.evaluate(()=>window.__updateCalls.length),last=await page.evaluate(()=>window.__updateCalls.at(-1)),start=performance.now(),original=await build(),target=JSON.parse(await readFile(resolve(bText,'release.json'),'utf8'));host.state.root=resolve(bText);
 await expect.poll(()=>page.evaluate(()=>window.__updateCalls.length),{timeout:75000,intervals:[1000,2000]}).toBeGreaterThan(callsBefore);const calls=await page.evaluate(()=>window.__updateCalls),gap=calls[callsBefore].start-last.start;assert(gap>=60000);await expect.poll(async()=> (await identity('waiting'))?.buildId,{timeout:30000}).toBe(target.buildId);const discoveryMs=performance.now()-start,ready=await shell('waiting');assert(ready.ready);assert.equal((await identity()).buildId,original);mark('settled-single-window-automatic-discovery',{discoveryMs,actualAppUpdateGapMs:gap,calls,ready,method:'Read-only wrapper timestamps actual registration.update calls; no new tabs/focus/reconnect/manual calls after target publication'});
}
async function inflightFlow(){
 assert(bText&&cText,'Inflight mode needs A/B/C');await launch();await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Easy',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);await prepare();await context.close();context=undefined;await launch();await resumeQuick();await panel();
 const original=await build(),before=await snapshot(),a=JSON.parse(await readFile(resolve(root,'release.json'),'utf8')),b=JSON.parse(await readFile(resolve(bText,'release.json'),'utf8')),c=JSON.parse(await readFile(resolve(cText,'release.json'),'utf8'));
 const unique=b.files.find(f=>f.path.endsWith('.js')&&!a.files.some(old=>old.path===f.path));assert(unique,'B needs real unique JS');let held=false;const gate=new Promise(done=>releaseHTTP=done);host.state.root=resolve(bText);host.state.fault=pathname=>{if(pathname.endsWith('/'+unique.path)){held=true;return {wait:gate};}};
 await page.getByRole('button',{name:'Check for updates',exact:true}).click();await expect.poll(()=>held,{timeout:15000}).toBe(true);const stateB=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {active:r.active?.state,installing:r.installing?.state,waiting:r.waiting?.state};});assert.equal(stateB.installing,'installing');mark('B-actually-held-installing',{resource:unique.path,state:stateB});
 const other=await context.newPage();await other.goto(url);await expect(other.locator('.menu-more')).toBeEnabled();await other.locator('.menu-more').click();await other.getByRole('button',{name:'Install and offline',exact:true}).click();await expect(other.getByRole('button',{name:'Check for updates',exact:true})).toBeEnabled();host.state.root=resolve(cText);await other.getByRole('button',{name:'Check for updates',exact:true}).click();mark('C-check-requested-while-B-held',{BInstallHeld:held});releaseHTTP();host.state.fault=undefined;
 await expect.poll(async()=> (await identity('waiting'))?.buildId,{timeout:75000,intervals:[500,1000,2000]}).toBe(c.buildId);const waiting=await shell('waiting');assert(waiting.ready);assert.equal(waiting.buildId,c.buildId);assert.equal((await identity()).buildId,original);assert.equal(await build(),original);const after=await snapshot();for(const key of ['attempts','pools','issued','issuedBuckets','receipts','receiptBuckets','profile'])assert.deepEqual(after[key],before[key]);mark('rapid-C-coherent-A-save-preserved',{waiting,original,bBuild:b.buildId});
}
async function exhaustionFlow(){
 await launch();await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Easy',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);await prepare();
 // Evict only the isolated app's disposable recent-shard store, preserving the prepared records.
 const essentialBefore=await snapshot();await page.evaluate(async()=>{const db=await new Promise((done,fail)=>{const r=indexedDB.open('toadodu:'+encodeURIComponent('/toadoku/'));r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});try{await new Promise((done,fail)=>{const tx=db.transaction('cache','readwrite');tx.objectStore('cache').clear();tx.oncomplete=done;tx.onabort=()=>fail(tx.error);});}finally{db.close();}});assert.deepEqual(await snapshot(),essentialBefore);
 await context.close();context=undefined;host.state.offline=true;await launch(true);await resumeQuick();
 async function replace(){await more();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'New puzzle',exact:true}).click();await expect(page.getByRole('button',{name:'Replace puzzle',exact:true})).toBeVisible();}
 for(let index=0;index<3;index++){const old=attempt(await snapshot(),'quick').id;await replace();await page.getByRole('button',{name:'Replace puzzle',exact:true}).click();await expect.poll(async()=>attempt(await snapshot(),'quick')?.id).not.toBe(old);await expect(page.getByRole('dialog')).toHaveCount(0);}
 await exhaustionTail();
}
async function exhaustionTail(){
 const before=await snapshot();let failed=0;page.on('requestfailed',request=>{if(request.url().includes('/catalog/'))failed++;});await more();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'New puzzle',exact:true}).click();await page.getByRole('button',{name:'Replace puzzle',exact:true}).click();await expect.poll(()=>failed).toBeGreaterThan(0);await expect(page.getByRole('button',{name:'Replace puzzle',exact:true})).toBeEnabled();const after=await snapshot(),text=await page.getByRole('dialog').innerText();
 assert.equal(attempt(after,'quick').id,attempt(before,'quick').id);assert.deepEqual(after.pools,before.pools);assert.deepEqual(after.issued,before.issued);assert.deepEqual(after.issuedBuckets,before.issuedBuckets);assert.equal(profileOf(after).wallet,profileOf(before).wallet);
 mark('exhausted-reserve-preserves-attempt',{text,attemptId:attempt(after,'quick').id,wallet:profileOf(after).wallet,failedRequests:failed});assert.match(text,/connect|offline|download/i,'Exhaustion must explain connectivity or offline preparation in the active modal');
}
async function uncontrolledFlow(){
 assert(bText,'Uncontrolled mode needs A and B frozen builds');await launch();await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Easy',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);await prepare();
 assert(await page.evaluate(()=>navigator.serviceWorker.controller===null),'First setup page must remain uncontrolled');const old=await snapshot(),oldBuild=await build(),b=JSON.parse(await readFile(resolve(bText,'release.json'),'utf8'));host.state.root=resolve(bText);
 await page.getByRole('button',{name:'Check for updates',exact:true}).click();await expect.poll(async()=> (await identity())?.buildId,{timeout:30000}).toBe(b.buildId);assert.equal(await build(),oldBuild);assert(await page.evaluate(()=>navigator.serviceWorker.controller===null));
 await expect(page.getByText(/^Update downloaded\./)).toBeVisible();mark('uncontrolled-old-document-new-active',{documentBuild:oldBuild,active:await shell(),text:await page.locator('.pwa-pane').innerText()});
 await context.close();context=undefined;host.state.offline=true;await launch(true);assert.equal(await build(),b.buildId);const reopened=await snapshot();assert.equal(attempt(reopened,'quick').id,attempt(old,'quick').id);assert.equal(profileOf(reopened).wallet,profileOf(old).wallet);mark('uncontrolled-cold-new-release-preserves-save',{build:await build()});
}
async function travelFlow(){
 await launch();await prepare('travel');await context.close();context=undefined;host.state.offline=true;await launch(true);
 await travelTail();
}
async function travelTail(){
 const existing=attempt(await snapshot(),'frontier');await page.getByRole('button',{name:'Progression',exact:true}).click();await page.getByRole('button',{name:existing?'Resume':'Start',exact:true}).click();
 for(let leap=1;leap<=60;leap++){
  const save=await solve('frontier',leap),frontier=profileOf(save).frontier;
  if([6,15,24,42,60].includes(leap))mark('offline-boundary',{completedLeap:leap,frontier,wallet:profileOf(save).wallet});
  if(leap<60){await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);}
 }
 const completed=await snapshot(),receipts=receiptsOf(completed);assert.equal(receipts.length,60);assert.equal(new Set(receipts.map(r=>r.attemptId)).size,60);assert.equal(profileOf(completed).wallet,receipts.reduce((sum,r)=>sum+r.result.dewdrops,0));
 await page.getByRole('button',{name:'Continue',exact:true}).click();await expect.poll(async()=>attempt(await snapshot(),'frontier')?.binding?.metamorphosis).toBe(2);await expect(page.locator('.cell')).toHaveCount(81);
 async function markRole(role,digit){await expect.poll(async()=>!!attempt(await snapshot(),role)).toBe(true);const current=attempt(await snapshot(),role),blank=[...current.definition.givens].findIndex(v=>v==='0');await page.locator('[data-cell="'+blank+'"]').press(digit);await expect.poll(async()=>attempt(await snapshot(),role)?.entries[blank]).toBe(Number(digit));await more();await page.getByRole('button',{name:'Main menu',exact:true}).click();}
 await markRole('frontier','1');await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Hard',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);await markRole('quick','2');
 await page.getByRole('button',{name:'Progression',exact:true}).click();await page.getByRole('button',{name:'Completed Leaps',exact:true}).click();await page.getByLabel(/^Choose a completed Leap/).selectOption('1');await page.getByRole('button',{name:'Start replay',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);
 await expect.poll(async()=>!!attempt(await snapshot(),'replay')).toBe(true);const replay=attempt(await snapshot(),'replay'),blank=[...replay.definition.givens].findIndex(v=>v==='0');await page.locator('[data-cell="'+blank+'"]').press('3');await expect.poll(async()=>attempt(await snapshot(),'replay')?.entries[blank]).toBe(3);await more();await page.getByRole('button',{name:'Settings',exact:true}).click();
 const allRoles=await snapshot();assert.equal(allRoles.attempts.filter(a=>a.generation===allRoles.current.generation).length,3);const wallet=profileOf(allRoles).wallet;
 await context.close();context=undefined;await launch(true);const coldRoles=await snapshot();for(const role of ['quick','frontier','replay'])for(const field of ['id','definition','entries','notes','notesMode','undo','assistance'])assert.deepEqual(attempt(coldRoles,role)[field],attempt(allRoles,role)[field],role+':'+field);assert.equal(profileOf(coldRoles).wallet,wallet);assert.equal(receiptsOf(coldRoles).length,60);
 mark('offline-run-complete',{profile:profileOf(coldRoles),roles:coldRoles.attempts.map(a=>({role:a.role,id:a.id,binding:a.binding})),receipts:receiptsOf(coldRoles).length});
}
try{
 if(mode==='offline')await offlineFlow();else if(mode==='offline-tail'){host.state.offline=true;await launch(true);await resumeQuick();await offlineTail();}else if(mode==='updates')await updateFlow();else if(mode==='inflight')await inflightFlow();else if(mode==='polling')await pollingFlow();else if(mode==='travel')await travelFlow();else if(mode==='travel-tail'){host.state.offline=true;await launch(true);await travelTail();}else if(mode==='uncontrolled')await uncontrolledFlow();else if(mode==='exhaustion')await exhaustionFlow();else if(mode==='exhaustion-tail'){
 await launch();const target=JSON.parse(await readFile(resolve(root,'release.json'),'utf8')).buildId,old=await snapshot();await panel();await page.getByRole('button',{name:'Check for updates',exact:true}).click();await expect.poll(async()=> (await identity('waiting'))?.buildId??(await identity())?.buildId,{timeout:30000}).toBe(target);mark('exhaustion-update-ready',{target,documentBuild:await build()});await context.close();context=undefined;host.state.offline=true;await launch(true);assert.equal(await build(),target);const reopened=await snapshot();assert.deepEqual(reopened.pools,old.pools);assert.deepEqual(reopened.issued,old.issued);assert.deepEqual(reopened.issuedBuckets,old.issuedBuckets);assert.equal(attempt(reopened,'quick').id,attempt(old,'quick').id);assert.equal(profileOf(reopened).wallet,profileOf(old).wallet);await resumeQuick();await exhaustionTail();
}else throw Error('Unknown journey mode');
 mark('passed');
}catch(error){mark('failed',{error:String(error),stack:error.stack});if(page)await page.screenshot({path:resolve(evidence,'failure.png')}).catch(()=>{});process.exitCode=1;}
finally{
 releaseHTTP();for(const cleanup of cleanups.reverse())await cleanup().catch(()=>{});if(context)await context.close();await host.close();
 async function diskBytes(path){let entries;try{entries=await readdir(path,{withFileTypes:true});}catch{return 0;}let bytes=0;for(const entry of entries){const child=resolve(path,entry.name);if(entry.isDirectory())bytes+=await diskBytes(child);else try{bytes+=(await stat(child)).size;}catch{}}return bytes;}
 log.closedProfileFileBytes={indexedDB:await diskBytes(resolve(profile,'Default/IndexedDB')),cacheStorage:await diskBytes(resolve(profile,'Default/Service Worker/CacheStorage')),httpCache:await diskBytes(resolve(profile,'Default/Cache')),note:'Actual selected profile file lengths after close, includes metadata/WAL and essential+disposable IDB together; not origin quota estimate or steady-state phone storage.'};
 await writeFile(resolve(evidence,'results.json'),JSON.stringify(log,null,2));
}
