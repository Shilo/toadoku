import assert from 'node:assert/strict';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('prototypes/production-ui-evidence/browsers');
const {chromium,expect}=await import('@playwright/test');
const resumeProfile=process.argv[3],root=resolve(process.argv[2]??'dist'),evidence=resolve('prototypes/pwa-validation/preparation-'+Date.now());
await mkdir(evidence,{recursive:true});
const host=await staticHost({root,port:5197,shaping:{latencyMs:150,bytesPerSecond:200000}}),result={conditions:{aggregateServerBodyBytesPerSecond:200000,headerLatencyMs:150,pageCpuFactor:4,workerCpu:'unthrottled',hardware:'desktop simulation'},events:[],requests:host.state.requests};
let context,releaseGate=()=>{};
const mark=(name,data={})=>{const event={name,...data};result.events.push(event);console.log(JSON.stringify(event));};
try{
 context=await chromium.launchPersistentContext(resumeProfile?resolve(resumeProfile):resolve(evidence,'profile'),{headless:true,viewport:{width:360,height:800},deviceScaleFactor:3});
 const page=context.pages()[0],cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');const heapSamples=[];async function sampleHeap(){const metrics=(await cdp.send('Performance.getMetrics')).metrics;heapSamples.push({at:performance.now(),used:metrics.find(m=>m.name==='JSHeapUsedSize')?.value});}await sampleHeap();
 await page.addInitScript(()=>{window.__downloadPerf={tasks:[],inputs:[],heaps:[]};setInterval(()=>{if(performance.memory)window.__downloadPerf.heaps.push({at:performance.now(),used:performance.memory.usedJSHeapSize});},250);new PerformanceObserver(list=>window.__downloadPerf.tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});addEventListener('keydown',e=>{if(e.isTrusted&&/^[1-9]$/.test(e.key)){const start=performance.now();requestAnimationFrame(()=>window.__downloadPerf.inputs.push({at:start,dispatch:Math.max(0,start-e.timeStamp),paint:performance.now()-start}));}},true);});
 await page.goto(host.origin+'/toadoku/',{waitUntil:'domcontentloaded'});await expect(page.locator('.menu-more')).toBeEnabled();
 await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:resumeProfile?'Resume':'Easy',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);
 if(!resumeProfile){
 const blank=page.locator('[data-clue="false"]').first(),boardAt=await page.evaluate(()=>performance.now());
 await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.installing),{timeout:10000}).toBe(true);
 let entered=0;
 while(entered<1000&&await page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.installing)){
  await blank.press(String(entered%2+1));entered++;if(entered%25===0)await sampleHeap();
 }
 await expect.poll(()=>page.evaluate(async()=> (await navigator.serviceWorker.getRegistration())?.active?.state),{timeout:180000}).toBe('activated');
 mark('input-during-shell-install',{entered,boardAt,metrics:await page.evaluate(()=>window.__downloadPerf)});
 }
 async function closeDialogs(){for(let depth=0;depth<8&&await page.getByRole('dialog').count();depth++)await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();}
 async function panel(idle=true){await page.locator('.dock .more').click();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Install and offline',exact:true}).click();if(idle)await expect(page.getByRole('button',{name:'Prepare a longer trip',exact:true})).toBeEnabled({timeout:30000});else await expect(page.getByRole('button',{name:'Cancel preparation',exact:true})).toBeVisible();}
 await panel();
 if(resumeProfile){
  const remove=page.getByRole('button',{name:'Remove extra puzzles',exact:true});if(await remove.isEnabled())await remove.click();
  await expect.poll(()=>page.evaluate(async()=>{const db=await new Promise((done,fail)=>{const r=indexedDB.open('toadodu:'+encodeURIComponent('/toadoku/')+':offline-v1');r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});try{return await new Promise((done,fail)=>{const tx=db.transaction('records','readonly'),r=tx.objectStore('records').count();tx.oncomplete=()=>done(r.result);tx.onabort=()=>fail(tx.error);});}finally{db.close();}})).toBe(0);
  await page.evaluate(async()=>{const db=await new Promise((done,fail)=>{const r=indexedDB.open('toadodu:'+encodeURIComponent('/toadoku/'));r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});try{await new Promise((done,fail)=>{const tx=db.transaction('cache','readwrite');tx.objectStore('cache').clear();tx.oncomplete=done;tx.onabort=()=>fail(tx.error);});}finally{db.close();}});
  await expect(page.getByRole('button',{name:'Prepare a longer trip',exact:true})).toBeEnabled();mark('resumed-preparation-tail',{profile:resolve(resumeProfile)});
 }
 await sampleHeap();
 const manifest=JSON.parse(await readFile(resolve(root,'catalog/v1/manifest.json'),'utf8'));
 let heldPath;const gate=new Promise(done=>releaseGate=done);
 host.state.fault=pathname=>{if(!heldPath&&/\/catalog\/v1\/(?:easy|medium-(?:low|high)|hard-(?:low|high))-\d+-[a-f0-9]+\.json$/.test(pathname)){heldPath=pathname;return {wait:gate};}};
 const preparingAt=await page.evaluate(()=>performance.now()),networkBefore=host.state.requests.length;
 await page.getByRole('button',{name:'Prepare a longer trip',exact:true}).click();
 await expect.poll(()=>heldPath,{timeout:30000}).toBeTruthy();await sampleHeap();
 const filename=heldPath.split('/').at(-1),heldPool=Object.keys(manifest.pools).find(pool=>manifest.pools[pool].shards.some(shard=>shard.path===filename));
 assert(heldPool);const band=heldPool.startsWith('hard')?'Easy':'Hard';
 await closeDialogs();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:band,exact:true}).click();
 const quickId=()=>page.evaluate(async()=>{const db=await new Promise((done,fail)=>{const r=indexedDB.open('toadodu:'+encodeURIComponent('/toadoku/'));r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});try{return await new Promise((done,fail)=>{const tx=db.transaction('attempts','readonly'),r=tx.objectStore('attempts').getAll();tx.oncomplete=()=>done(r.result.find(a=>a.role==='quick')?.id);tx.onabort=()=>fail(tx.error);});}finally{db.close();}});
 const oldQuick=await quickId(),demandStart=performance.now();await page.getByRole('button',{name:'Replace puzzle',exact:true}).click();await expect.poll(quickId,{timeout:15000}).not.toBe(oldQuick);await expect(page.locator('.cell')).toHaveCount(81);
 mark('foreground-bypasses-held-background',{heldPath,heldPool,requestedBand:band,demandMs:performance.now()-demandStart,gateReleased:false,requests:host.state.requests.slice(networkBefore).map(entry=>({...entry}))});
 releaseGate();host.state.fault=undefined;
 const nextBlank=page.locator('[data-clue="false"]').first();
 for(let index=0;index<100;index++){await nextBlank.press(String(index%2+1));if(index%25===0)await sampleHeap();}
 await panel(false);
 const beforeCancel=await page.locator('.pwa-pane').innerText();
 const cancel=page.getByRole('button',{name:'Cancel preparation',exact:true});
 if(await cancel.count())await cancel.click();await sampleHeap();
 const requestsAtCancel=host.state.requests.length;await expect.poll(()=>host.state.requests.filter(r=>/catalog\/v1\/(?:easy|medium|hard)/.test(r.path)).every(r=>r.end!==undefined||r.closed)).toBe(true);assert.equal(host.state.requests.slice(requestsAtCancel).filter(r=>r.path.includes('/catalog/v1/')&&!r.path.endsWith('manifest.json')).length,0);
 mark('cancel-keeps-partial',{beforeCancel,afterCancel:await page.locator('.pwa-pane').innerText()});
 const metrics=await page.evaluate(()=>({...window.__downloadPerf,heap:performance.memory?.usedJSHeapSize,storageEstimate:undefined}));
 const optionalInputs=metrics.inputs.filter(e=>e.at>=preparingAt).sort((a,b)=>a.dispatch-b.dispatch),p95=optionalInputs[Math.floor((optionalInputs.length-1)*.95)];
 const optionalTasks=metrics.tasks.filter(e=>e.start>=preparingAt);
 const maxTask=Math.max(0,...optionalTasks.map(e=>e.duration)),paintP95=[...optionalInputs].sort((a,b)=>a.paint-b.paint)[Math.floor((optionalInputs.length-1)*.95)];
 result.metrics={...metrics,heapSamples,largestSampledPageHeap:Math.max(0,...heapSamples.map(e=>e.used??0)),heapSampling:'CDP page heap at phase boundaries and every25keys; performance.memory bucket retained but not treated as exact',workerHeapMeasured:false,optionalDispatchP95:p95?.dispatch,optionalPaintP95:paintP95?.paint,optionalMaxTask:maxTask};
 assert(optionalInputs.length>=100);assert(p95.dispatch<=100,'input dispatch p95 exceeds100ms');assert(paintP95.paint<=100,'paint p95 exceeds100ms');assert(maxTask<=200,'optional preparation added task over200ms');
 mark('passed',{optionalDispatchP95:p95.dispatch,optionalPaintP95:paintP95.paint,maxTask,heap:metrics.heap});
}catch(error){mark('failed',{error:String(error),stack:error.stack});process.exitCode=1;}
finally{releaseGate();if(context)await context.close();await host.close();await writeFile(resolve(evidence,'results.json'),JSON.stringify(result,null,2));}
