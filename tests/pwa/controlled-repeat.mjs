import { resolve } from 'node:path';
import { mkdir,writeFile } from 'node:fs/promises';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('prototypes/production-ui-evidence/browsers');
const {chromium,expect}=await import('@playwright/test'),[root,profileText]=process.argv.slice(2),profile=resolve(profileText),dir=resolve('prototypes/pwa-validation/controlled-repeat-'+Date.now()),samples=[];
await mkdir(dir,{recursive:true});const host=await staticHost({root,port:5197,shaping:{latencyMs:150,bytesPerSecond:200000}});
try{for(let sample=0;sample<3;sample++){
 const context=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:360,height:800},deviceScaleFactor:3});
 try{
 const page=context.pages()[0],cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});const before=host.state.requests.length;
 const response=await page.goto(host.origin+'/toadoku/',{waitUntil:'domcontentloaded'});await expect(page.locator('.menu-more')).toBeEnabled();const menuMs=await page.evaluate(()=>performance.now());
 await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.cell')).toHaveCount(81);const boardMs=await page.evaluate(()=>performance.now()),controller=await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL??null);if(!controller)throw Error('Repeat not controlled');
 const value={sample,menuMs,boardMs,controller,navigationFromServiceWorker:response.fromServiceWorker(),build:await page.locator('meta[name="toadoku-build"]').getAttribute('content'),requests:host.state.requests.slice(before).map(e=>({...e}))};samples.push(value);console.log(JSON.stringify(value));
 }finally{await context.close();}
}}finally{await host.close();await writeFile(resolve(dir,'results.json'),JSON.stringify({root,profile,conditions:{network:'Aggregate200000B/sbody+150msheaders',pageCpuFactor:4,scenario:'Three actual browser-close/reopen cycles with existing verified shell; no new puzzle allocated'},samples},null,2));}
