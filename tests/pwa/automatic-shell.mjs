import { resolve } from 'node:path';
import { mkdir,writeFile } from 'node:fs/promises';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('prototypes/production-ui-evidence/browsers');
const {chromium,expect}=await import('@playwright/test'),root=process.argv[2],dir=resolve('prototypes/pwa-validation/automatic-shell-'+Date.now());
await mkdir(dir,{recursive:true});const host=await staticHost({root,port:5197,shaping:{latencyMs:150,bytesPerSecond:200000}}),events=[],profile=resolve(dir,'profile');
const context=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:360,height:800},deviceScaleFactor:3}),page=context.pages()[0],cdp=await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('ServiceWorker.enable');cdp.on('ServiceWorker.workerErrorReported',e=>events.push({workerError:e}));
try{
 await page.goto(host.origin+'/toadoku/',{waitUntil:'domcontentloaded'});await expect(page.locator('.menu-more')).toBeEnabled();await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Easy',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);
 const start=performance.now();let previous='';
 await expect.poll(async()=>{
  const state=await page.evaluate(async()=>({hidden:document.hidden,url:location.href,controller:navigator.serviceWorker.controller?.scriptURL??null,registration:await navigator.serviceWorker.getRegistration().then(r=>r?{active:r.active?.state,installing:r.installing?.state,waiting:r.waiting?.state}:null),enabledDock:[...document.querySelectorAll('.dock button')].filter(b=>!b.disabled).length,status:[...document.querySelectorAll('[role="status"]')].map(e=>e.textContent),localChecks:[...Object.keys(localStorage)].filter(k=>k.includes('pwa')).map(k=>[k,localStorage.getItem(k)])}));
  const event={elapsedMs:performance.now()-start,state,lastRequest:host.state.requests.at(-1)?.path,requested:host.state.requests.length,writtenBodyBytes:host.state.requests.reduce((n,r)=>n+r.sentBodyBytes,0)};events.push(event);
  if(JSON.stringify([state,event.lastRequest])!==previous){console.log(JSON.stringify(event));previous=JSON.stringify([state,event.lastRequest]);}
  await writeFile(resolve(dir,'progress.json'),JSON.stringify({events,requests:host.state.requests},null,2));
  return state.registration?.active;
 },{timeout:40000,intervals:[500]}).toBe('activated');
 console.log('AUTOMATIC_SHELL_PASSED');
}catch(e){events.push({failure:String(e)});console.log(String(e));process.exitCode=1;}
finally{await context.close();await host.close();await writeFile(resolve(dir,'results.json'),JSON.stringify({root,profile,events,requests:host.state.requests},null,2));}
