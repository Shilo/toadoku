import { openMenuSettings } from './ui.mjs';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('prototypes/production-ui-evidence/browsers');
const {chromium,expect}=await import('@playwright/test'),root=process.argv[2],dir=resolve('prototypes/pwa-validation/hidden-shell-'+Date.now());
await mkdir(dir,{recursive:true});const host=await staticHost({root,port:5198}),events=[];let release=()=>{},context;
try{
 context=await chromium.launchPersistentContext(resolve(dir,'profile'),{headless:true,viewport:{width:360,height:800}});
 const page=context.pages()[0];await page.goto(host.origin+'/toadoku/',{waitUntil:'domcontentloaded'});await expect(page.locator('.menu-more')).toBeEnabled();await openMenuSettings(page);await page.getByRole('button',{name:'Install and offline',exact:true}).click();await expect(page.getByRole('button',{name:'Prepare offline play',exact:true})).toBeEnabled();
 let held=false;const gate=new Promise(done=>release=done);host.state.fault=pathname=>{if(/\/assets\/raw-recovery\.worker-[^/]+\.js$/.test(pathname)){held=true;return {wait:gate};}};
 await page.getByRole('button',{name:'Prepare offline play',exact:true}).click();await expect.poll(()=>held,{timeout:15000}).toBe(true);
 const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();const realHidden=await page.evaluate(()=>document.hidden);
 if(!realHidden)await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 events.push({name:'hidden-during-real-shell-download',visibility:realHidden?'actual browser tab visibility':'labelled simulation: document.hidden overridden and visibilitychange dispatched',heldResource:'raw-recovery.worker'});
 if(realHidden)await page.bringToFront();else await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
 await other.close();release();host.state.fault=undefined;
 await expect.poll(()=>page.evaluate(async()=> (await navigator.serviceWorker.getRegistration())?.active?.state),{timeout:30000}).toBe('activated');await expect(page.getByText('App files verified for offline use.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Prepare offline play',exact:true})).toBeEnabled({timeout:30000});
 const counts=await page.locator('.pwa-pane dl').first().locator('dd').allTextContents(),shards=host.state.requests.filter(r=>/\/catalog\/v1\/(?:easy|medium|hard)-/.test(r.path));
 assert.deepEqual(counts,['0','0','0']);assert.equal(shards.length,0);events.push({name:'passed',counts,newPuzzleShardRequests:shards.length,build:await page.locator('meta[name="toadoku-build"]').getAttribute('content')});console.log(JSON.stringify(events));
}catch(error){events.push({name:'failed',error:String(error),stack:error.stack});console.log(JSON.stringify(events));process.exitCode=1;}
finally{release();if(context)await context.close();await host.close();await writeFile(resolve(dir,'results.json'),JSON.stringify({root,events,requests:host.state.requests},null,2));}
