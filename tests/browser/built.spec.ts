import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dictionaries } from '../../src/lib/i18n';

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
      const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.txt':'text/plain','.png':'image/png'};
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
  await page.goto(`${origin}/toadoku/?lang=de`);
  await expect.poll(()=>page.getByRole('img',{name:dictionaries.de.art}).evaluate(e=>(e as HTMLImageElement).naturalWidth)).toBe(1254);
  await page.getByRole('button',{name:'Schnellspiel',exact:true}).click();
  await page.getByRole('button',{name:'Leicht',exact:true}).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  await page.getByRole('button',{name:'Mehr',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.reload();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.cell')).toHaveCount(81);
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.fonts.check('16px Outfit')&&document.fonts.check('80px Chewy'))).toBe(true);
  expect(errors).toEqual([]);expect(requests.every(url=>url.startsWith(`${origin}/toadoku/`))).toBe(true);
  const assets=await readdir('dist/assets');
  const images=assets.filter(f=>/\.(png|jpg|webp|svg|wasm)$/i.test(f));
  expect(images).toHaveLength(1);
  expect(images[0]).toMatch(/^menu-sketch-.*\.png$/);
  expect(createHash('sha256').update(await readFile(`dist/assets/${images[0]}`)).digest('hex')).toBe('b4c53b629017faa5f57c9a72d3cb80d182268dd729b93e842ddd6be229ffedf1');
  for(const file of assets.filter(f=>/\.(js|css)$/.test(f)))expect(await readFile(`dist/assets/${file}`,'utf8')).not.toMatch(/prototypes\/|menu-placeholder|serviceWorker\.register/);
  for(const file of ['Chewy-LICENSE.txt','Outfit-OFL.txt'])expect(await readFile(`dist/licenses/${file}`)).toEqual(await readFile(`src/assets/fonts/${file}`));
  const dependencies=JSON.parse(await readFile('dist/licenses/dependencies.json','utf8')) as {name:string;identifier:string;text:string}[];
  expect(dependencies.map(d=>d.name).sort()).toEqual(['clsx','svelte']);
  expect(dependencies.every(d=>d.identifier==='MIT'&&d.text.includes('Permission is hereby granted'))).toBe(true);
});
