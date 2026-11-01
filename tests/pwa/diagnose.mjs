import { resolve } from 'node:path';
import { mkdir,writeFile } from 'node:fs/promises';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('prototypes/production-ui-evidence/browsers');
const {chromium,expect}=await import('@playwright/test'),evidence=resolve('prototypes/pwa-validation/diagnose-'+Date.now());
await mkdir(evidence,{recursive:true});const host=await staticHost({root:process.argv[2],port:5198}),events=[];
const context=await chromium.launchPersistentContext(resolve(evidence,'profile'),{headless:true});
try{
 const page=context.pages()[0],cdp=await context.newCDPSession(page);
 await cdp.send('ServiceWorker.enable');cdp.on('ServiceWorker.workerErrorReported',event=>{events.push(event);console.log(JSON.stringify(event));});
 context.on('console',msg=>{events.push({console:msg.type(),text:msg.text()});if(msg.type()==='error')console.log(msg.text());});
 page.on('pageerror',e=>events.push({pageerror:e.message}));
 await page.goto(host.origin+'/toadoku/',{waitUntil:'domcontentloaded'});await expect(page.locator('.menu-more')).toBeEnabled();
 const state=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker.register(new URL('worker.js',location.href),{scope:new URL('./',location.href).href,updateViaCache:'none'}),worker=reg.installing;
  if(worker)await new Promise(done=>{const timer=setTimeout(done,20000);worker.addEventListener('statechange',()=>{if(['activated','redundant','installed'].includes(worker.state)){clearTimeout(timer);done();}});});
  return {active:reg.active?.state,waiting:reg.waiting?.state,installing:reg.installing?.state,worker:worker?.state,caches:await Promise.all((await caches.keys()).map(async name=>({name,urls:(await(await caches.open(name)).keys()).map(r=>r.url)})))};
 });
 console.log(JSON.stringify(state));events.push({state});
}finally{await context.close();await host.close();await writeFile(resolve(evidence,'results.json'),JSON.stringify({events,requests:host.state.requests},null,2));}
