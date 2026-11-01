import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { mkdir,writeFile } from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('prototypes/production-ui-evidence/browsers');
const {chromium,expect}=await import('@playwright/test'),profile=resolve(process.argv[2]),dir=resolve('prototypes/pwa-validation/cancel-readback-'+Date.now());
await mkdir(dir,{recursive:true});const context=await chromium.launchPersistentContext(profile,{headless:true});let result;
try{
 await context.setOffline(true);const page=context.pages()[0],response=await page.goto('http://127.0.0.1:5197/toadoku/',{waitUntil:'domcontentloaded'});assert(response.fromServiceWorker());await expect(page.locator('.menu-more')).toBeEnabled();await page.locator('.menu-more').click();await page.getByRole('button',{name:'Install and offline',exact:true}).click();await expect(page.getByRole('button',{name:'Prepare offline play',exact:true})).toBeEnabled();
 const inventory=await page.evaluate(async()=>{const name='toadodu:'+encodeURIComponent('/toadoku/')+':offline-v1',db=await new Promise((done,fail)=>{const r=indexedDB.open(name);r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});try{return await new Promise((done,fail)=>{const tx=db.transaction('records','readonly'),r=tx.objectStore('records').getAll();tx.oncomplete=()=>done({records:r.result.length,jsonBytes:r.result.reduce((n,row)=>n+new TextEncoder().encode(row.json).length,0)});tx.onabort=()=>fail(tx.error);});}finally{db.close();}});
 assert(inventory.records>=4);result={passed:true,profile,navigationFromServiceWorker:true,inventory,counts:await page.locator('.pwa-pane dl').first().locator('dd').allTextContents(),text:await page.locator('.pwa-pane').innerText()};console.log(JSON.stringify(result));
}catch(error){result={passed:false,error:String(error)};process.exitCode=1;console.log(JSON.stringify(result));}
finally{await context.close();await writeFile(resolve(dir,'results.json'),JSON.stringify(result,null,2));}
