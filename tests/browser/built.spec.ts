import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dictionaries } from '../../src/lib/i18n';
import { appCopy } from '../../src/lib/gameplay/app-copy';
import type { Attempt } from '../../src/lib/gameplay/contracts';

let server:Server,origin:string;
test.beforeAll(async()=>{
  const build=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{encoding:'utf8'});
  expect(build.status,build.stderr).toBe(0);
  const root=resolve('dist');
  server=createServer(async(req,res)=>{
    const path=decodeURIComponent(new URL(req.url!,'http://local').pathname);
    if(!path.startsWith('/toadoku/')){res.writeHead(404).end();return;}
    const file=resolve(root,path.slice('/toadoku/'.length)||'index.html');
    if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
    try {
      const bytes=await readFile(file);
      const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.woff2':'font/woff2','.txt':'text/plain','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
      res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(bytes);
    }catch{res.writeHead(404).end();}
  });
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
});
test.afterAll(async()=>{await new Promise<void>(done=>server.close(()=>done()));});
test('built bundle runs under repository subpath with local assets and notices',async({page})=>{
  const errors:string[]=[],requests:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00-07:00'));
  await page.goto(`${origin}/toadoku/?lang=de`);
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
  await expect(page).toHaveTitle('Toadoku');
  await expect(page.getByRole('heading', {name:'Toadoku',exact:true})).toBeVisible();
  expect(requests.some(url => /cauldron-|GermaniaOne-UI/.test(url))).toBe(false);
  await expect.poll(()=>page.getByRole('img',{name:dictionaries.de.art}).evaluate(e=>(e as HTMLImageElement).naturalWidth)).toBe(1254);
  await page.getByRole('button',{name:'Schnellspiel',exact:true}).click();
  await page.getByRole('button',{name:'Leicht',exact:true}).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  const readAttempt = () => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve,reject) => {const request=indexedDB.open('toadodu:%2Ftoadoku%2F');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    try { return await new Promise<Attempt>((resolve,reject)=>{const tx=db.transaction('attempts','readonly');const req=tx.objectStore('attempts').getAll();tx.oncomplete=()=>resolve(req.result[0]);tx.onabort=()=>reject(tx.error);}); }
    finally { db.close(); }
  });
  const originalId=(await readAttempt()).id;
  const blank=page.locator('[data-clue="false"]').first(); await blank.press('1');
  const blankIndex=Number(await blank.getAttribute('data-cell'));
  await expect.poll(async()=>(await readAttempt()).entries[blankIndex]).toBe(1);
  const originalEntries=await page.locator('.cell').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
  await page.getByRole('button',{name:'Mehr',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.reload();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.cell')).toHaveCount(0);
  await page.getByRole('button',{name:'Schnellspiel',exact:true}).click();
  await page.getByRole('button',{name:appCopy.de.resume,exact:true}).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  expect((await readAttempt()).id).toBe(originalId); expect(await page.locator('.cell').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')))).toEqual(originalEntries);
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>[...document.fonts].filter(face => face.family === 'ToadokuPondUI' && face.status === 'loaded').map(face => face.weight).sort())).toEqual(['400','700']);
  expect(await page.evaluate(()=>[...document.fonts].some(face => face.family.replaceAll('"','') === 'ToadokuSolving' && face.status === 'loaded'))).toBe(true);
  expect(requests.some(url => /(?:Chewy|Creepster).*\.(?:ttf|woff2)/.test(url))).toBe(false);
  await page.getByRole('button',{name:'Mehr',exact:true}).click();
  await page.getByRole('button',{name:'Einstellungen',exact:true}).click();
  await page.getByRole('combobox',{name:'Thema',exact:true}).selectOption('cauldron');
  await expect(page.locator('.world')).toHaveAttribute('data-theme','cauldron');
  expect(await page.evaluate(()=>[...document.fonts].some(face => face.family === 'ToadokuCauldronUI' && face.status === 'loaded'))).toBe(true);
  expect(requests.some(url=>/\/cauldron-[^/]+\.js/.test(url))).toBe(true);
  expect(requests.some(url=>/GermaniaOne-UI-[^/]+\.woff2/.test(url))).toBe(true);
  expect(errors).toEqual([]);expect(requests.every(url=>url.startsWith(`${origin}/toadoku/`))).toBe(true);
  const assets=await readdir('dist/assets');
  const images=assets.filter(f=>/\.(png|jpg|webp|svg|wasm)$/i.test(f));
  expect(images).toHaveLength(1);
  expect(images[0]).toMatch(/^menu-sketch-.*\.png$/);
  expect(createHash('sha256').update(await readFile(`dist/assets/${images[0]}`)).digest('hex')).toBe('b4c53b629017faa5f57c9a72d3cb80d182268dd729b93e842ddd6be229ffedf1');
  for(const file of assets.filter(f=>/\.(js|css)$/.test(f)))expect(await readFile(`dist/assets/${file}`,'utf8')).not.toMatch(/prototypes\/|menu-placeholder/);
  const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));
  expect({id:manifest.id,scope:manifest.scope,start:manifest.start_url}).toEqual({id:'./',scope:'./',start:'./'});
  await expect.poll(()=>page.evaluate(async()=>{
    const registration=await navigator.serviceWorker.getRegistration(location.href);
    return registration?.active?.scriptURL ?? registration?.installing?.scriptURL;
  })).toBe(origin+'/toadoku/worker.js');
  expect(await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration(location.href);return {scope:r?.scope,updateViaCache:r?.updateViaCache};})).toEqual({scope:origin+'/toadoku/',updateViaCache:'none'});
  for(const file of ['Chewy-LICENSE.txt','Outfit-OFL.txt','Creepster-OFL.txt','Almendra-OFL.txt','GermaniaOne-OFL.txt'])expect(await readFile(`dist/licenses/${file}`)).toEqual(await readFile(`src/assets/fonts/${file}`));
  const dependencies=JSON.parse(await readFile('dist/licenses/dependencies.json','utf8')) as {name:string;identifier:string;text:string}[];
  expect(dependencies.map(d=>d.name).sort()).toEqual(['@lucide/svelte','clsx','svelte']);
  expect(dependencies.filter(d=>d.name!=='@lucide/svelte').every(d=>d.identifier==='MIT'&&d.text.includes('Permission is hereby granted'))).toBe(true);
  expect(dependencies.find(d=>d.name==='@lucide/svelte')?.identifier).toBe('ISC');
  expect(await readFile('dist/licenses/lucide-LICENSE.txt')).toEqual(await readFile('public/licenses/lucide-LICENSE.txt'));
});
