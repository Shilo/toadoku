import { expect, test } from '@playwright/test';
import type { Page, Worker as BrowserWorker } from '@playwright/test';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { exactCover } from '../../tools/catalog/oracle-exact-cover.ts';
import type { Attempt, CompletionReceipt, Preferences, Profile, Role, RoleRecord } from '../../src/lib/gameplay/contracts';
import { uiCopy } from '../../src/lib/gameplay/ui/copy';
import { appCopy } from '../../src/lib/gameplay/app-copy';
import { inspectRecovery } from '../storage/recovery-reader';

const evidence = 'prototypes/gameplay-validation/journeys';
test.use({ baseURL: 'http://127.0.0.1:5191', actionTimeout: 10000, trace:'retain-on-failure', screenshot:'only-on-failure' });
let server: Server;
interface WorkerGate { asset?: 'hint' | 'shard' | 'raw-recovery'; seen: number; url?: string; aborted: boolean; released: Promise<void>; release: () => void; finished: Promise<void>; finish: () => void }
let workerGate: WorkerGate | undefined;
interface Snapshot { meta: { generation: string; essentialRevision: number }; profile: Profile; preferences: Preferences; roles: RoleRecord[]; attempts: Attempt[]; receipts: CompletionReceipt[]; issued: { id: string; groupId: string }[] }
test.beforeAll(async ({ browserName, browser }) => {
  await mkdir(evidence, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-'), root = resolve(evidence, `build-${stamp}`);
  const sourceRoot=process.env.TOADODU_JOURNEY_BUILD?resolve(process.env.TOADODU_JOURNEY_BUILD):resolve('dist');if(process.env.TOADODU_JOURNEY_BUILD&&!sourceRoot.startsWith(resolve(evidence)+sep))throw Error('Frozen replay build must remain inside journey evidence');
  const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
  const indexBefore = await readFile(resolve(sourceRoot,'index.html')); await cp(sourceRoot, root, { recursive: true });
  if (hash(indexBefore) !== hash(await readFile(resolve(root, 'index.html'))) || hash(indexBefore) !== hash(await readFile(resolve(sourceRoot,'index.html')))) throw new Error('Build changed while freezing journey artifact');
  const assets = (await readdir(resolve(root, 'assets'))).filter(file => /\.(js|css)$/.test(file)).sort();
  const artifact=JSON.stringify({ root, sourceRoot, browserName, browserVersion:browser.version(), indexSha256: hash(indexBefore), assets: Object.fromEntries(await Promise.all(assets.map(async file => [file, hash(await readFile(resolve(root, 'assets', file)))]))), catalogManifestSha256: hash(await readFile(resolve(root, 'catalog/v1/manifest.json'))) })+'\n';
  await writeFile(`${evidence}/runtime-artifact.json`, artifact); await writeFile(`${evidence}/runtime-artifact-${browserName}.json`,artifact);
  server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname, path = resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
    if(pathname==='/__recovery_fault_setup__.html'){response.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Explicit recovery fault setup</title>');return;}
    if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' };
    const gate = workerGate && (workerGate.asset==='shard'?/\/catalog\/v1\/(?!manifest)[^/]+\.json$/.test(pathname):new RegExp(`/${workerGate.asset??'backup'}\\.worker-[^/]+\\.js$`).test(pathname)) ? workerGate : undefined;
    if (gate) { gate.seen++; gate.url=pathname; response.on('close',()=>{if(!response.writableFinished)gate.aborted=true;}); }
    void (async()=>{try { if(gate)await gate.released; const bytes=await readFile(path); if(!response.destroyed){response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', ...(pathname.includes('.worker-')?{'Cache-Control':'no-store'}:{}) }); if(gate)await new Promise<void>(resolve=>{response.once('finish',resolve);response.once('close',resolve);response.end(bytes);});else response.end(bytes);} }catch {if(!response.destroyed)response.writeHead(404).end();}finally{gate?.finish();}})();
  });
  await new Promise<void>(resolve => server.listen(5191, '127.0.0.1', resolve));
});
test.afterAll(async () => { if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
test.afterEach(()=>{workerGate?.release();workerGate=undefined;});
async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(async () => {
    const names = await indexedDB.databases(), name = names.find(db => db.name?.startsWith('toadodu:'))?.name;
    if (!name) throw new Error('No application database');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(name); let expired = false;
      const timer = setTimeout(() => { expired = true; reject(new Error('Readonly database open exceeded five seconds')); }, 5000);
      r.onsuccess = () => { clearTimeout(timer); if (expired) r.result.close(); else resolve(r.result); };
      r.onerror = () => { clearTimeout(timer); expired = true; reject(r.error); };
      r.onblocked = () => { clearTimeout(timer); expired = true; reject(new Error('Readonly database open blocked')); };
    });
    try {
      return await new Promise<any>((resolve, reject) => {
        const stores=['meta','profile','settings','roles','attempts','receipts','issued','receiptBuckets','issuedBuckets'].filter(store=>db.objectStoreNames.contains(store));
        const tx = db.transaction(stores, 'readonly'), values: Record<string, any> = {};
        const timer = setTimeout(() => { tx.abort(); reject(new Error('Readonly assertion transaction exceeded five seconds')); }, 5000);
        const meta = tx.objectStore('meta').get('current'); meta.onsuccess = () => values.meta = meta.result;
        const layouts=tx.objectStore('meta').getAll(),layoutKeys=tx.objectStore('meta').getAllKeys();layouts.onsuccess=()=>values.layouts=layouts.result;layoutKeys.onsuccess=()=>values.layoutKeys=layoutKeys.result;
        for (const store of stores.filter(store=>store!=='meta')) { const r = tx.objectStore(store).getAll(); r.onsuccess = () => values[store] = r.result; if(['receipts','issued','receiptBuckets','issuedBuckets'].includes(store)){const keys=tx.objectStore(store).getAllKeys();keys.onsuccess=()=>values[`${store}Keys`]=keys.result;} }
        tx.onerror = () => { clearTimeout(timer); reject(tx.error); }; tx.onabort = () => { clearTimeout(timer); reject(tx.error); };
        tx.oncomplete = () => {
          clearTimeout(timer);
          try {
          const generation = values.meta.generation, active = (store: string) => values[store].filter((record: any) => record.generation === generation);
          const keyed=(store:string)=>{const records=values[store]??[],keys=values[`${store}Keys`]??[];if(records.length!==keys.length)throw Error('History key count');return records.map((record:any,index:number)=>({record,key:keys[index]})).filter(({key}:{key:any})=>Array.isArray(key)&&key[0]===generation);};
          const layoutsForGeneration=values.layouts.map((record:any,index:number)=>({record,key:values.layoutKeys[index]})).filter(({key}:{key:any})=>Array.isArray(key)&&key[0]===generation&&key[1]==='layout');
          if(layoutsForGeneration.length!==1)throw Error('Missing or duplicate history layout');const layout=layoutsForGeneration[0].record.layout;if(!['rows-v1','buckets-v1'].includes(layout))throw Error('Unsupported history layout');if(layoutsForGeneration[0]&&layoutsForGeneration[0].record.generation!==generation)throw Error('History layout generation');
          const maps={id:new Map<string,any>(),group:new Map<string,any>(),receipt:new Map<string,any>()};type Kind=keyof typeof maps;
          const recordId=(kind:Kind,record:any)=>kind==='receipt'?record.attemptId:kind==='group'?record.groupId:record.id;
          const address=(kind:Kind,id:string)=>{if(kind!=='receipt'){if(!/^[a-f0-9]{64}$/.test(id))throw Error('History hash');return id.slice(0,2);}let hash=2166136261n;for(let index=0;index<id.length;index++)hash=((hash^BigInt(id.charCodeAt(index)))*16777619n)&0xffffffffn;return Number(hash&255n).toString(16).padStart(2,'0');};
          const add=(kind:Kind,id:string,record:any)=>{if(!record||record.generation!==generation||typeof id!=='string'||!id||recordId(kind,record)!==id||maps[kind].has(id))throw Error('History binding or duplicate');maps[kind].set(id,record);};
          for(const category of ['issued','receipts'] as const){
            for(const {record,key} of keyed(category)){if(key.length!==2||typeof key[1]!=='string')throw Error('History row key');const text=key[1];if(layout==='rows-v1'){const match=/^(id|group):(.+)$/.exec(text);if(category==='receipts')add('receipt',text,record);else{if(!match)throw Error('Issued row address');add(match[1] as Kind,match[2],record);}}else{const match=/^overflow:(id|group|receipt):(.+)$/.exec(text);if(!match||record.physicalVersion!==1||record.generation!==generation||record.kind!==match[1]||record.id!==match[2]||(category==='receipts')!==(match[1]==='receipt'))throw Error('Overflow binding');add(match[1] as Kind,match[2],record.record);}}
            const buckets=keyed(category==='issued'?'issuedBuckets':'receiptBuckets');if(layout==='rows-v1'&&buckets.length)throw Error('Legacy bucket mismatch');
            for(const {record,key} of buckets){const match=typeof key[1]==='string'?/^(id|group|receipt):([a-f0-9]{2})$/.exec(key[1]):null;if(key.length!==2||!match||record.physicalVersion!==1||record.generation!==generation||record.kind!==match[1]||record.bucket!==match[2]||(category==='receipts')!==(match[1]==='receipt')||!Array.isArray(record.items)||record.items.length>1024||Object.keys(record.items).length!==record.items.length||new TextEncoder().encode(JSON.stringify(record)).byteLength>512*1024)throw Error('Bucket binding or cap');for(let index=0;index<record.items.length;index++){if(!Object.prototype.propertyIsEnumerable.call(record.items,index))throw Error('Bucket hole');const item=record.items[index],kind=match[1] as Kind,id=recordId(kind,item);if(address(kind,id)!==match[2])throw Error('Bucket hash');add(kind,id,item);}}
          }
          if(maps.id.size!==maps.group.size)throw Error('History pair count');for(const record of maps.id.values()){const pair=maps.group.get(record.groupId);if(!pair||['generation','id','groupId','catalogVersion','pool','firstAttemptId','issues'].some(field=>record[field]!==pair[field]))throw Error('History pair mismatch');}
          resolve({ meta: values.meta, profile: active('profile')[0], preferences: active('settings')[0], roles: active('roles'), attempts: active('attempts'), receipts: [...maps.receipt.values()], issued: [...maps.id.values()] });
          } catch (error) { reject(error); }
        };
      });
    } finally { db.close(); }
  });
}
function roleAttempt(save: Snapshot, role: Role): Attempt {
  const id = save.roles.find(r => r.role === role)?.attemptId, attempt = save.attempts.find(a => a.id === id);
  if (!attempt) throw new Error(`No active ${role} attempt`); return attempt;
}
async function board(page: Page) { await expect(page.locator('.cell')).toHaveCount(81); await expect(page.locator('.dock button')).toHaveCount(10); }
function controlGlyphMetrics(element:Element){
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),textRects:ReturnType<DOMRect['toJSON']>[]=[];
  while(walker.nextNode()){if(!walker.currentNode.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(walker.currentNode);textRects.push(...[...range.getClientRects()].map(rect=>rect.toJSON()));}
  const button=element.closest('button')!;
  return {text:element.textContent,scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,scrollHeight:element.scrollHeight,clientHeight:element.clientHeight,font:getComputedStyle(element).fontSize,badge:element.getBoundingClientRect().toJSON(),icons:[...button.querySelectorAll('svg')].map(icon=>icon.getBoundingClientRect().toJSON()),textRects,control:button.getBoundingClientRect().toJSON()};
}
async function badgeFits(page:Page,locale:'en'|'de'|'es',kind:'unsavedShort'|'unscoredShort'){
  for(const[width,height]of[[320,568],[568,320]]){
    await page.setViewportSize({width,height});await expect(page.locator('.dock')).toHaveClass(width>height?/landscape/:/^(?!.*landscape)/);
    const button=page.locator('.dock .more'),badge=button.locator('.save-label');await expect(badge).toHaveText(appCopy[locale][kind]);await expect(button.locator('svg')).toHaveCount(2);
    const control=await button.boundingBox(),bounds=await badge.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(control!.x);expect(bounds!.y).toBeGreaterThanOrEqual(control!.y);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(control!.x+control!.width+.01);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(control!.y+control!.height+.01);
    const metrics=await badge.evaluate(controlGlyphMetrics);await writeFile(`${evidence}/badge-metrics-${page.context().browser()?.browserType().name()}-${kind}-${locale}-${width}x${height}.json`,JSON.stringify(metrics));
    expect(parseFloat(metrics.font)).toBeGreaterThanOrEqual(11);expect(new Set(metrics.textRects.map(rect=>Math.round(rect.top*100)/100)).size).toBeLessThanOrEqual(2);expect(metrics.icons.map(icon=>[icon.width,icon.height])).toEqual([[20,20],[12,12]]);for(const rect of [...metrics.textRects,...metrics.icons]){expect(rect.left).toBeGreaterThanOrEqual(metrics.control.left);expect(rect.top).toBeGreaterThanOrEqual(metrics.control.top);expect(rect.right).toBeLessThanOrEqual(metrics.control.right);expect(rect.bottom).toBeLessThanOrEqual(metrics.control.bottom);}expect(await button.getAttribute('aria-label')).toContain(appCopy[locale][kind]);expect(await button.getAttribute('aria-label')).toContain(uiCopy[locale].notes);await page.screenshot({path:`${evidence}/badge-${kind}-${locale}-${width}x${height}.png`});
  }
}
async function more(page: Page) { await page.locator('.dock .more').click(); await expect(page.getByRole('dialog')).toBeVisible(); }
async function closeDialogs(page: Page) {
  for (let depth = 0; depth < 6 && await page.getByRole('dialog').count(); depth++) {
    const dialog = page.getByRole('dialog'), oldTitle = await dialog.locator('h2').textContent();
    await dialog.getByRole('button', { name: /^(Close|Schließen|Cerrar)$/, exact: true }).click();
    try { await expect.poll(()=>page.evaluate(()=>document.querySelector('dialog[open] h2')?.textContent??'')).not.toBe(oldTitle); }
    catch(error){console.error('B001 dismissal diagnostics',JSON.stringify({oldTitle,...await page.evaluate(()=>({url:location.href,history:history.state,dialogs:[...document.querySelectorAll('dialog')].map(dialog=>({open:dialog.open,title:dialog.querySelector('h2')?.textContent,content:dialog.textContent?.slice(0,1000)}))}))}));throw error;}
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function settleResume(page: Page, recoverHint = false) {
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#(?:board|more)$/);
  if (new URL(page.url()).hash === '#more') {
    await expect(page.getByRole('dialog')).toBeVisible();
    if (recoverHint) { await expect(page.getByRole('dialog').locator('h3')).toHaveCount(1); await expect.poll(async () => roleAttempt(await snapshot(page), 'quick').assistance.used).toBe(true); }
  }
  await closeDialogs(page); await expect(page).toHaveURL(/#board$/); await board(page);
}
async function settings(page: Page) { await more(page); await page.getByRole('dialog').getByRole('button', { name: /^(Settings|Einstellungen|Ajustes)$/, exact: true }).click(); }
async function mainMenu(page: Page) { await more(page); await page.getByRole('dialog').getByRole('button', { name: /^(Main menu|Hauptmenü|Menú principal)$/, exact: true }).click(); await expect(page.locator('.menu-panel')).toBeVisible(); }
async function quick(page: Page, band: 'Easy' | 'Medium' | 'Hard') { await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: band, exact: true }).click(); await board(page); }
async function digit(page: Page, cell: number, value: number) { await page.locator(`[data-cell="${cell}"]`).click(); await page.keyboard.press(String(value)); }
async function notesMode(page: Page, enabled: boolean) {
  if (!!await page.locator('.dock .notes-mode').count() === enabled) return;
  await more(page); await page.getByRole('dialog').getByRole('button', { name: 'Notes', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function domPuzzle(page: Page) {
  const givens = await page.locator('.cell').evaluateAll(cells => cells.map(cell => (cell as HTMLElement).dataset.clue === 'true' ? cell.querySelector('.digit')?.textContent : '0').join(''));
  expect(givens).toMatch(/^[0-9]{81}$/);
  const answer = exactCover(givens);
  if (answer.kind !== 'complete' || answer.count !== 1 || !answer.solution) throw new Error('The actual displayed givens lack an independent unique solution');
  return { givens, solution: answer.solution };
}
async function solve(page: Page) {
  await notesMode(page, false); const puzzle = await domPuzzle(page);
  for (let id = 0; id < 81; id++) if (puzzle.givens[id] === '0') await digit(page, id, Number(puzzle.solution[id]));
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Puzzle complete', exact: true })).toBeVisible({ timeout: 15000 });
  return puzzle;
}
async function exportUiBackup(page: Page, filename: string) {
  await settings(page); await page.getByRole('dialog').getByRole('button', { name: 'Backup', exact: true }).click();
  const pending = page.waitForEvent('download'); await page.getByRole('dialog').getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await pending; await download.saveAs(`${evidence}/${filename}`); await closeDialogs(page); await board(page);
}
async function waitForDurableEntry(page: Page, role: Role, cell: number, value: number) {
  await expect.poll(async () => roleAttempt(await snapshot(page), role).entries[cell]).toBe(value);
}

for (const band of ['Easy','Medium','Hard'] as const) test(`real ${band} Quick Play loads only one progressive shard and supports input, hints and durable result`, async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 360, height: 800 });
  const requests: string[] = []; page.on('request', r => { if (/\/catalog\/v1\/.*\.json$/.test(r.url())) requests.push(r.url()); });
  await page.goto('/'); await expect(page.getByRole('button', { name: 'Quick Play', exact: true })).toBeEnabled(); expect(requests).toHaveLength(0);
  await quick(page, band); expect(requests.filter(url => url.endsWith('/manifest.json'))).toHaveLength(1); expect(requests.filter(url => !url.endsWith('/manifest.json'))).toHaveLength(1);
  const initial = roleAttempt(await snapshot(page), 'quick'), puzzle = await domPuzzle(page); expect(initial.definition.givens).toBe(puzzle.givens);
  const blanks = [...puzzle.givens].map((d,i) => d === '0' ? i : -1).filter(i => i >= 0), first = blanks.find(cell => blanks.some(i => i !== cell && (Math.floor(i / 9) === Math.floor(cell / 9) || i % 9 === cell % 9)))!, peer = blanks.find(i => i !== first && (Math.floor(i / 9) === Math.floor(first / 9) || i % 9 === first % 9))!;
  const chosen = Number(puzzle.solution[first]);
  await notesMode(page, true); await digit(page, first, chosen); await digit(page, peer, chosen);
  await expect(page.locator(`[data-cell="${peer}"] .note`)).toHaveText(String(chosen)); await notesMode(page, false); await digit(page, first, chosen);
  await expect(page.locator(`[data-cell="${peer}"] .note`)).toHaveCount(0);
  await more(page); await page.getByRole('dialog').getByRole('button', { name: 'Undo', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator(`[data-cell="${peer}"] .note`)).toHaveText(String(chosen)); await expect(page.locator(`[data-cell="${first}"] .digit`)).toHaveCount(0);
  await digit(page, first, chosen); await waitForDurableEntry(page, 'quick', first, chosen);
  console.log(`B001 ${band}: real entry and compound notes/undo persisted for ${initial.id}`);
  await more(page); await page.getByRole('dialog').getByRole('button', { name: 'Hint', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(uiCopy.en.hintHelp);
  await page.getByRole('dialog').getByRole('button', { name: 'Find a logical hint', exact: true }).click();
  await expect.poll(async () => roleAttempt(await snapshot(page), 'quick').assistance.used).toBe(true);
  console.log(`B001 ${band}: durable assistance recorded`);
  await expect(page.getByRole('dialog').locator('h3')).toHaveCount(1);
  const helped = roleAttempt(await snapshot(page), 'quick'); expect(helped.pendingDisclosure).toBeDefined();
  console.log(`B001 ${band}: visible hint matches durable disclosure`);
  await closeDialogs(page); await mainMenu(page); await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).click(); await settleResume(page, true);
  await page.reload(); await expect(page.getByRole('button', { name: 'Quick Play', exact: true })).toBeEnabled(); await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).click(); await settleResume(page, true);
  expect(roleAttempt(await snapshot(page), 'quick').id).toBe(initial.id); await expect(page.locator(`[data-cell="${first}"] .digit`)).toHaveText(String(chosen));
  console.log(`B001 ${band}: exact attempt resumed across reload`);
  await solve(page); const completed = await snapshot(page), paid = roleAttempt(completed, 'quick'); expect(paid.id).toBe(initial.id); expect(paid.status).toBe('completed'); expect(completed.receipts).toHaveLength(1); expect(completed.profile.wallet).toBe(completed.receipts[0].result.dewdrops);
  await closeDialogs(page); await more(page); await page.getByRole('dialog').getByRole('button', { name: 'View result', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('Dewdrops earned');
  await page.getByRole('dialog').getByRole('button', { name: 'Continue', exact: true }).dblclick({ delay: 80 }); await board(page); await expect(page.getByRole('dialog')).toHaveCount(0);
  const next = await snapshot(page); expect(roleAttempt(next, 'quick').id).not.toBe(initial.id); expect(next.receipts).toHaveLength(1); expect(next.profile.wallet).toBe(completed.profile.wallet);
  await page.screenshot({ path: `${evidence}/quick-${band.toLowerCase()}-continued.png` });
});

test('real preferences preserve the visible puzzle and keep readable settings and tools timed', async ({ page }) => {
  test.setTimeout(60000); await page.setViewportSize({ width: 360, height: 800 }); await page.goto('/'); await quick(page, 'Easy');
  const original = roleAttempt(await snapshot(page), 'quick'), puzzle = await domPuzzle(page), cell = puzzle.givens.indexOf('0');
  await digit(page, cell, Number(puzzle.solution[cell])); const paths = await page.locator('.cell .face path').evaluateAll(nodes => nodes.map(n => n.getAttribute('d')));
  await more(page); const before = roleAttempt(await snapshot(page), 'quick').elapsedMs;
  await expect.poll(async () => roleAttempt(await snapshot(page), 'quick').elapsedMs, { timeout: 5000 }).toBeGreaterThan(before);
  await page.getByRole('dialog').getByRole('button', { name: 'Settings', exact: true }).click(); await board(page);
  await page.getByRole('combobox', { name: 'Board shape', exact: true }).focus(); await expect(page.getByRole('combobox', { name: 'Board shape', exact: true })).toBeFocused(); await page.getByRole('combobox', { name: 'Board shape', exact: true }).selectOption('square'); await expect(page.getByRole('combobox', { name: 'Board shape', exact: true })).toBeEnabled(); await expect(page.getByRole('combobox', { name: 'Board shape', exact: true })).toBeFocused();
  await page.getByRole('combobox', { name: 'Motion', exact: true }).selectOption('reduced'); await expect(page.getByRole('combobox', { name: 'Motion', exact: true })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('de'); await expect(page.getByRole('combobox', { name: 'Sprache', exact: true })).toBeEnabled();
  const readable = roleAttempt(await snapshot(page), 'quick').elapsedMs;
  await expect.poll(async () => roleAttempt(await snapshot(page), 'quick').elapsedMs, { timeout: 5000 }).toBeGreaterThan(readable);
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('es'); await expect(page.getByRole('combobox', { name: 'Idioma', exact: true })).toBeEnabled();
  await closeDialogs(page); await board(page); const bounds = await page.locator('.board').boundingBox(), dock = await page.locator('.dock').boundingBox(); expect(bounds!.width).toBe(bounds!.height); expect(dock!.y - bounds!.y - bounds!.height).toBe(8);
  expect(await page.locator('.cell .face path').evaluateAll(nodes => nodes.map(n => n.getAttribute('d')))).toEqual(paths);
  await page.setViewportSize({ width: 800, height: 360 }); await expect(page.locator('.dock')).toHaveClass(/landscape/);const rotated = await page.locator('.board').boundingBox(), rightDock = await page.locator('.dock').boundingBox(); expect(rotated!.width).toBe(rotated!.height); expect(rightDock!.x - rotated!.x - rotated!.width).toBe(8);
  const restored = roleAttempt(await snapshot(page), 'quick'); expect(restored.id).toBe(original.id); expect(restored.entries[cell]).toBe(Number(puzzle.solution[cell])); expect((await snapshot(page)).preferences).toMatchObject({ language: 'es', motion: 'reduced', boardShape: 'square' });
});

test('failed uncached next content preserves the old attempt and catalog-free resume works', async ({ page }) => {
  test.setTimeout(60000); await page.goto('/'); await quick(page, 'Easy'); const old = roleAttempt(await snapshot(page), 'quick'); await mainMenu(page);
  let blocked = 0; await page.route('**/catalog/v1/*.json', route => { if (route.request().url().endsWith('/manifest.json')) return route.continue(); blocked++; return route.fulfill({ status: 404, body: 'missing' }); });
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Hard', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Replace puzzle', exact: true }).click();
  await expect.poll(() => blocked).toBeGreaterThan(0); await expect.poll(async () => roleAttempt(await snapshot(page), 'quick').id).toBe(old.id);
  await closeDialogs(page); const routeBeforeReload = new URL(page.url()).hash; await page.reload(); await expect.poll(() => new URL(page.url()).hash).toBe(routeBeforeReload); await expect(page.getByRole('navigation', { name: 'Quick Play', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Resume', exact: true }).click(); await settleResume(page); expect(roleAttempt(await snapshot(page), 'quick').id).toBe(old.id);
});

test('actual second-tab resume conceals the stale writer and retains one attempt', async ({ page, context }) => {
  test.setTimeout(60000); await page.goto('/'); await quick(page, 'Easy'); const original = roleAttempt(await snapshot(page), 'quick');
  const second = await context.newPage(); await second.goto('/'); await second.getByRole('button', { name: 'Quick Play', exact: true }).click(); await second.getByRole('button', { name: 'Resume', exact: true }).click(); await board(second);
  await expect(page.locator('.cell')).toHaveCount(0, { timeout: 10000 }); expect(roleAttempt(await snapshot(second), 'quick').id).toBe(original.id); expect(roleAttempt(await snapshot(second), 'quick').writer.epoch).toBeGreaterThan(original.writer.epoch);
  await second.close();
});

test('actual rule feedback stays local and restart cannot erase disclosed assistance', async ({ page }) => {
  test.setTimeout(60000); await page.goto('/'); await quick(page,'Hard'); const puzzle=await domPuzzle(page), original=roleAttempt(await snapshot(page),'quick');
  const share=(a:number,b:number)=>Math.floor(a/9)===Math.floor(b/9)||a%9===b%9||Math.floor(a/27)===Math.floor(b/27)&&Math.floor(a%9/3)===Math.floor(b%9/3);
  const blanks=[...puzzle.givens].map((value,cell)=>value==='0'?cell:-1).filter(cell=>cell>=0);
  const choice=blanks.flatMap(cell=>Array.from({length:9},(_,i)=>({cell,value:i+1}))).find(({cell,value})=>value!==Number(puzzle.solution[cell])&&![...puzzle.givens].some((digit,other)=>Number(digit)===value&&share(cell,other)));
  if(!choice)throw Error('Certified Hard board has no locally legal wrong alternative for this journey');
  await digit(page,choice.cell,choice.value); await waitForDurableEntry(page,'quick',choice.cell,choice.value); await expect(page.locator('.conflict-mark')).toHaveCount(0);
  await more(page); await page.getByRole('button',{name:'Hint',exact:true}).click(); await page.getByRole('button',{name:'Find a logical hint',exact:true}).click(); await expect(page.getByRole('dialog')).toContainText(uiCopy.en.inconsistent);
  const disclosed=roleAttempt(await snapshot(page),'quick'); expect(disclosed.assistance.used).toBe(true); expect(disclosed.assistance.exposed).toEqual([]); await closeDialogs(page);
  async function restart(){await settings(page);await page.getByRole('button',{name:'Restart puzzle',exact:true}).click();await page.getByRole('button',{name:'Restart puzzle',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await board(page);}
  await restart(); const restarted=roleAttempt(await snapshot(page),'quick'); expect(restarted.id).toBe(original.id); expect(restarted.entries.every(value=>value===0)).toBe(true); expect(restarted.notes.every(value=>value===0)).toBe(true); expect(restarted.elapsedMs).toBeGreaterThanOrEqual(disclosed.elapsedMs); expect(restarted.assistance).toEqual(disclosed.assistance);
  const clue=[...puzzle.givens].findIndex(digit=>digit!=='0'), conflict=blanks.find(cell=>share(cell,clue))!; await digit(page,conflict,Number(puzzle.givens[clue])); await expect(page.locator(`[data-cell="${clue}"] .conflict-mark`)).toBeVisible(); await expect(page.locator(`[data-cell="${conflict}"] .conflict-mark`)).toBeVisible();
  await digit(page,clue,Number(puzzle.givens[clue])%9+1); expect(roleAttempt(await snapshot(page),'quick').entries[clue]).toBe(0); await page.locator(`[data-cell="${conflict}"]`).click(); await page.keyboard.press('Backspace');
  await page.locator(`[data-cell="${choice.cell}"]`).click(); await more(page); await page.getByRole('button',{name:'Hint',exact:true}).click(); await page.getByRole('button',{name:'Reveal selected answer',exact:true}).click(); await expect(page.getByRole('heading',{name:'Selected answer',exact:true})).toBeVisible();
  const revealed=roleAttempt(await snapshot(page),'quick'); expect(revealed.assistance.exposed).toEqual([choice.cell]); await closeDialogs(page); await restart(); expect(roleAttempt(await snapshot(page),'quick').assistance).toEqual(revealed.assistance);
  await mainMenu(page); await page.reload(); await page.getByRole('button',{name:'Quick Play',exact:true}).click(); await page.getByRole('button',{name:'Resume',exact:true}).click(); await settleResume(page,true); expect(roleAttempt(await snapshot(page),'quick').assistance).toEqual(revealed.assistance);
});

test('production feature chunks and workers load only at their actual requested feature', async ({ page, context }) => {
  test.setTimeout(60000); let phase = 'menu'; const network: { phase: string; url: string }[] = [], workers: { phase: string; url: string }[] = [];
  context.on('request', request => network.push({ phase, url: request.url() })); page.on('worker', worker => workers.push({ phase, url: worker.url() }));
  await page.goto('/'); await expect(page.getByRole('button', { name: 'Quick Play', exact: true })).toBeEnabled();
  expect(network.filter(r => /GameDialog-|(?:hint|backup)\.worker-|\/catalog\//.test(r.url))).toEqual([]); expect(workers).toEqual([]);
  phase = 'allocate'; await quick(page, 'Easy'); expect(network.filter(r => /\/catalog\/v1\/.*\.json$/.test(r.url))).toHaveLength(2);
  expect(network.filter(r => /GameDialog-|(?:hint|backup)\.worker-/.test(r.url))).toEqual([]);
  phase = 'more'; await more(page); await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeVisible();
  expect(network.filter(r => /GameDialog-.*\.js$/.test(r.url))).toHaveLength(1); expect(workers).toEqual([]);
  phase = 'hint'; await page.getByRole('button', { name: 'Hint', exact: true }).click(); await page.getByRole('button', { name: 'Find a logical hint', exact: true }).click();
  await expect.poll(() => workers.filter(r => /hint\.worker-/.test(r.url)).length).toBe(1); await expect(page.getByRole('dialog').locator('h3')).toHaveCount(1);
  expect(workers.filter(r => /backup\.worker-/.test(r.url))).toEqual([]);
  await closeDialogs(page); await settings(page); await page.getByRole('button', { name: 'Backup', exact: true }).click(); expect(workers.filter(r => /backup\.worker-/.test(r.url))).toEqual([]);
  phase = 'backup'; const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export backup', exact: true }).click(); await (await downloaded).saveAs(`${evidence}/lazy-feature-backup.json`);
  await expect.poll(() => workers.filter(r => /backup\.worker-/.test(r.url)).length).toBe(1);
  expect(workers.every(r => /hint\.worker-/.test(r.url) ? r.phase === 'hint' : /backup\.worker-/.test(r.url) && r.phase === 'backup')).toBe(true);
  await writeFile(`${evidence}/feature-network.json`, JSON.stringify({ network, workers }, null, 2));
});

for(const dismissal of ['Close','Escape','Back'] as const)test(`closing a delayed feature import with ${dismissal} preserves authority and late resolution cannot reopen it`, async ({ page }) => {
  test.setTimeout(60000); await page.goto('/'); await quick(page, 'Easy'); const original = roleAttempt(await snapshot(page), 'quick'), puzzle = await domPuzzle(page), cell = puzzle.givens.indexOf('0');
  let release!: () => void, blocked = 0; const held = new Promise<void>(resolve => release = resolve);
  await page.route('**/assets/GameDialog-*.js', async route => { blocked++; await held; await route.continue(); });
  await page.locator(`[data-cell="${cell}"]`).click(); await more(page); await expect.poll(() => blocked).toBe(1); await expect(page.getByRole('status')).toContainText('Loading');
  await page.keyboard.press(String(puzzle.solution[cell])); expect(roleAttempt(await snapshot(page), 'quick').entries[cell]).toBe(0);
  if(dismissal==='Back')await page.goBack();else if(dismissal==='Escape')await page.keyboard.press('Escape');else await page.getByRole('button', { name: 'Close', exact: true }).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  try{await expect(page.locator('.dock').getByRole('button',{name:puzzle.solution[cell],exact:true})).toBeEnabled();await digit(page,cell,Number(puzzle.solution[cell]));await waitForDurableEntry(page,'quick',cell,Number(puzzle.solution[cell]));}
  catch(error){await writeFile(`${evidence}/delayed-dialog-${dismissal}-before-release-state.json`,JSON.stringify(await page.evaluate(()=>({url:location.href,dialogs:document.querySelectorAll('dialog').length,keys:[...document.querySelectorAll<HTMLButtonElement>('.dock button')].map(key=>({label:key.textContent,disabled:key.disabled}))}))));throw error;}
  finally{release();}
  await more(page); await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeVisible(); await closeDialogs(page);
  expect(roleAttempt(await snapshot(page), 'quick').id).toBe(original.id); await expect(page.getByRole('dialog')).toHaveCount(0);
});

function holdAsset(asset:'hint'|'shard'|'raw-recovery'):WorkerGate{let release!:()=>void,finish!:()=>void;const released=new Promise<void>(resolve=>release=resolve),finished=new Promise<void>(resolve=>finish=resolve);const gate:WorkerGate={asset,seen:0,aborted:false,released,release,finished,finish};workerGate=gate;return gate;}

test('native Back cancels a pending hint before disclosure and fresh explicit help still works',async({page})=>{
  test.setTimeout(60000);await page.goto('/');await quick(page,'Easy');const original=roleAttempt(await snapshot(page),'quick');await more(page);await page.getByRole('button',{name:'Hint',exact:true}).click();const gate=holdAsset('hint');await page.getByRole('button',{name:'Find a logical hint',exact:true}).click();await expect.poll(()=>gate.seen).toBe(1);
  await page.goBack();await expect(page.getByRole('heading',{name:'Game',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Hint',exact:true})).toBeEnabled();expect(roleAttempt(await snapshot(page),'quick').assistance.used).toBe(false);gate.release();await gate.finished;workerGate=undefined;
  await page.getByRole('button',{name:'Hint',exact:true}).click();await expect(page.getByRole('dialog').locator('h3')).toHaveCount(0);expect(roleAttempt(await snapshot(page),'quick').assistance.used).toBe(false);await page.getByRole('button',{name:'Find a logical hint',exact:true}).click();await expect(page.getByRole('dialog').locator('h3')).toHaveCount(1);const after=roleAttempt(await snapshot(page),'quick');expect(after.id).toBe(original.id);expect(after.assistance.used).toBe(true);
});

test('outside double-click dismisses More without entering the underlying dock digit',async({page})=>{
  await page.setViewportSize({width:360,height:800});await page.goto('/');await quick(page,'Easy');const puzzle=await domPuzzle(page),cell=puzzle.givens.indexOf('0');await page.locator(`[data-cell="${cell}"]`).click();const original=roleAttempt(await snapshot(page),'quick'),key=page.locator('.dock').getByRole('button',{name:'1',exact:true}),bounds=(await key.boundingBox())!,point={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};await more(page);const dialog=(await page.getByRole('dialog').boundingBox())!;expect(point.x<dialog.x||point.x>dialog.x+dialog.width||point.y<dialog.y||point.y>dialog.y+dialog.height).toBe(true);
  await page.mouse.dblclick(point.x,point.y);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(key).toBeEnabled();await expect(page.locator(`[data-cell="${cell}"] .digit`)).toHaveCount(0);const after=roleAttempt(await snapshot(page),'quick');expect(after.entries).toEqual(original.entries);expect(after.notes).toEqual(original.notes);await key.click();await waitForDurableEntry(page,'quick',cell,1);
});

test('native Back cancels uncached allocation without surprising navigation or hidden issuance',async({page})=>{
  test.setTimeout(60000);await page.goto('/');await page.getByRole('button',{name:'Quick Play',exact:true}).click();const gate=holdAsset('shard');await page.getByRole('button',{name:'Easy',exact:true}).click();await expect.poll(()=>gate.seen).toBe(1);await page.goBack();await expect(page.getByRole('button',{name:'Quick Play',exact:true})).toBeEnabled();await expect(page.locator('.cell')).toHaveCount(0);gate.release();await gate.finished;workerGate=undefined;
  await quick(page,'Hard');const save=await snapshot(page);expect(roleAttempt(save,'quick').policy.band).toBe('hard');expect(save.issued).toHaveLength(1);expect(save.receipts).toHaveLength(0);expect(new Set(save.issued.map(record=>record.groupId)).size).toBe(1);
});

test('a failed actual feature chunk offers retry and safe manual reopening without losing the saved board', async ({ page }) => {
  test.setTimeout(60000); await page.goto('/'); await quick(page, 'Easy'); const original = roleAttempt(await snapshot(page), 'quick'), puzzle = await domPuzzle(page), cell = puzzle.givens.indexOf('0'); await digit(page, cell, Number(puzzle.solution[cell])); await waitForDurableEntry(page, 'quick', cell, Number(puzzle.solution[cell]));
  const failed: { url: string; resourceType: string }[] = []; await page.route('**/assets/GameDialog-*.js', route => { failed.push({url:route.request().url(),resourceType:route.request().resourceType()}); return route.fulfill({ status: 404, contentType: 'text/javascript', body: 'missing' }); });
  await more(page); await expect(page.getByRole('dialog')).toContainText(appCopy.en.featureLoadError); expect(new Set(failed.map(request=>request.url)).size).toBe(1); expect(failed.length).toBeGreaterThanOrEqual(1);
  await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText(appCopy.en.featureLoadError);
  await page.getByRole('button', { name: 'Close', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); expect(roleAttempt(await snapshot(page), 'quick').id).toBe(original.id);
  await more(page); await expect(page.getByRole('dialog')).toContainText(appCopy.en.featureLoadError); await page.unroute('**/assets/GameDialog-*.js');
  await expect(page.getByRole('dialog')).toContainText(appCopy.en.reopenHelp);
  await expect(page.getByRole('button', { name: 'Reload app', exact: true })).toHaveCount(0);
  await waitForDurableEntry(page,'quick',cell,Number(puzzle.solution[cell]));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).click(); await settleResume(page);
  const resumed = roleAttempt(await snapshot(page), 'quick'); expect(resumed.id).toBe(original.id); expect(resumed.entries[cell]).toBe(Number(puzzle.solution[cell])); await more(page); await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeVisible();
  await writeFile(`${evidence}/failed-feature-urls.json`, JSON.stringify(failed));
});

test('completed Quick difficulty choice survives load failure without a throwaway puzzle',async({page})=>{
  test.setTimeout(90000);await page.goto('/');await quick(page,'Easy');await solve(page);const completed=await snapshot(page),old=roleAttempt(completed,'quick');await closeDialogs(page);await mainMenu(page);
  async function chooseHard(){await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Hard',exact:true}).click();await expect(page.getByRole('button',{name:'Continue · Hard',exact:true})).toBeEnabled();}
  await chooseHard();let failures=0;await page.route('**/catalog/v1/hard-*.json',route=>{failures++;return route.fulfill({status:404,body:'missing'});});await page.getByRole('button',{name:'Continue · Hard',exact:true}).click();await expect.poll(()=>failures).toBeGreaterThan(0);await expect(page.getByRole('button',{name:'Continue · Hard',exact:true})).toBeEnabled();let current=await snapshot(page);expect(roleAttempt(current,'quick').id).toBe(old.id);expect(current.issued).toHaveLength(completed.issued.length);expect(current.receipts).toHaveLength(1);await page.unroute('**/catalog/v1/hard-*.json');
  const gate=holdAsset('shard');await page.getByRole('button',{name:'Continue · Hard',exact:true}).click();await expect.poll(()=>gate.seen).toBe(1);await page.goBack();await expect(page.getByRole('dialog')).toHaveCount(0);gate.release();await gate.finished;workerGate=undefined;await more(page);await page.getByRole('button',{name:'View result',exact:true}).click();await expect(page.getByRole('button',{name:'Continue · Hard',exact:true})).toBeEnabled();expect((await snapshot(page)).issued).toHaveLength(completed.issued.length);
  await page.reload();await page.getByRole('button',{name:'Quick Play',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Continue · Hard',exact:true})).toHaveCount(0);await closeDialogs(page);await mainMenu(page);await chooseHard();await page.getByRole('button',{name:'Continue · Hard',exact:true}).click();await board(page);await expect(page.getByRole('dialog')).toHaveCount(0);current=await snapshot(page);expect(roleAttempt(current,'quick').policy.band).toBe('hard');expect(roleAttempt(current,'quick').id).not.toBe(old.id);expect(current.issued).toHaveLength(completed.issued.length+1);expect(new Set(current.issued.map(record=>record.groupId)).size).toBe(new Set(completed.issued.map(record=>record.groupId)).size+1);expect(current.receipts).toHaveLength(1);
});

test('future storage stays recoverable through a real nonimportable download without a repository',async({page})=>{
  await page.goto('/__recovery_fault_setup__.html');
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
    const request=indexedDB.open('toadodu:%2F',7);
    request.onupgradeneeded=()=>{request.result.createObjectStore('future');request.result.createObjectStore('__proto__');};
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result,tx=db.transaction(['future','__proto__'],'readwrite');tx.objectStore('future').put({schemaVersion:999,wallet:NaN,unknown:'retained'},['future-gen','profile']);const cycle:any={label:'future-cycle'};cycle.self=cycle;tx.objectStore('__proto__').put(new Map([['retained',cycle]]),'odd-store');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};
  }));
  const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
  await page.goto('/');await expect(page.getByRole('button',{name:appCopy.en.recovery,exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:uiCopy.en.restore,exact:true})).toHaveCount(0);
  expect(requests.filter(url=>/raw-recovery\.worker-/.test(url))).toHaveLength(0);
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:appCopy.en.recovery,exact:true}).click();const file=`${evidence}/future-raw-recovery.json`;await(await pending).saveAs(file);
  const recovered=inspectRecovery(await readFile(file,'utf8'));expect(recovered.databaseVersion).toBe(7);expect(recovered.stores.map((store:any)=>store.name).sort()).toEqual(['__proto__','future']);
  const future=recovered.stores.find((store:any)=>store.name==='future');expect(future.keys).toEqual([['future-gen','profile']]);expect(Number.isNaN(future.values[0].wallet)).toBe(true);expect(future.values[0].unknown).toBe('retained');const odd=recovered.stores.find((store:any)=>store.name==='__proto__').values[0].get('retained');expect(odd.self).toBe(odd);
  expect(requests.filter(url=>/raw-recovery\.worker-/.test(url))).toHaveLength(1);
  await expect(page.locator('.cell')).toHaveCount(0);await expect(page.getByRole('button',{name:appCopy.en.recovery,exact:true})).toBeEnabled();
});

test('corrupt current metadata and receipt bytes are retained in a real manual recovery download',async({page})=>{
  await page.goto('/');await quick(page,'Easy');const before=await snapshot(page);
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
    const request=indexedDB.open('toadodu:%2F');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['meta','receipts'],'readwrite');tx.objectStore('meta').put({generation:'corrupt-fixture',essentialRevision:NaN},'current');tx.objectStore('receipts').put({broken:'receipt-retained',amount:Infinity},['corrupt-fixture','broken']);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};
  }));
  await page.reload();await expect(page.getByRole('button',{name:appCopy.en.recovery,exact:true})).toBeEnabled();const pending=page.waitForEvent('download');await page.getByRole('button',{name:appCopy.en.recovery,exact:true}).click();const file=`${evidence}/corrupt-raw-recovery.json`;await(await pending).saveAs(file);const recovered=inspectRecovery(await readFile(file,'utf8'));
  const meta=recovered.stores.find((store:any)=>store.name==='meta'),current=meta.values[meta.keys.findIndex((key:any)=>key==='current')];expect(Number.isNaN(current.essentialRevision)).toBe(true);expect(current.generation).toBe('corrupt-fixture');const receipts=recovered.stores.find((store:any)=>store.name==='receipts');expect(receipts.values).toContainEqual({broken:'receipt-retained',amount:Infinity});const attempts=recovered.stores.find((store:any)=>store.name==='attempts');expect(attempts.values.some((attempt:any)=>attempt.id===roleAttempt(before,'quick').id)).toBe(true);
});

for(const cancellation of ['Close','Escape','Back'] as const)test(`actual raw recovery worker cancels with ${cancellation} and a fresh download still works`,async({page})=>{
  test.setTimeout(60000);await page.goto('/');await quick(page,'Easy');const original=await snapshot(page);
  await page.evaluate(generation=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('toadodu:%2F');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('profile','readwrite'),store=tx.objectStore('profile'),read=store.get(generation);read.onsuccess=()=>store.put({...read.result,wallet:NaN},generation);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};}),original.meta.generation);
  await page.reload();await expect(page.getByRole('button',{name:uiCopy.en.restore,exact:true})).toBeEnabled();await page.getByRole('button',{name:uiCopy.en.restore,exact:true}).click();await expect(page.getByRole('heading',{name:uiCopy.en.backup,exact:true})).toBeVisible();
  const active=new Set<BrowserWorker>();let downloads=0;page.on('download',()=>downloads++);page.on('worker',worker=>{if(/raw-recovery\.worker-/.test(worker.url())){active.add(worker);worker.on('close',()=>active.delete(worker));}});const gate=holdAsset('raw-recovery');await page.getByRole('dialog').getByRole('button',{name:uiCopy.en.emergencyExport,exact:true}).click();await expect.poll(()=>gate.seen).toBe(1);
  await expect(page.getByRole('dialog').getByRole('button',{name:uiCopy.en.emergencyExport,exact:true})).toBeDisabled();await expect(page.getByRole('dialog').getByRole('button',{name:uiCopy.en.close,exact:true})).toBeEnabled();await expect(page.getByRole('dialog').getByRole('button',{name:uiCopy.en.back,exact:true})).toBeEnabled();if(cancellation==='Escape')await page.keyboard.press('Escape');else await page.getByRole('dialog').getByRole('button',{name:cancellation,exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);gate.release();await gate.finished;workerGate=undefined;await expect.poll(()=>active.size).toBe(0);
  await page.getByRole('button',{name:uiCopy.en.restore,exact:true}).click();await expect(page.getByRole('dialog').getByRole('status')).not.toContainText(uiCopy.en.recoveryUnavailable);const pending=page.waitForEvent('download');await page.getByRole('dialog').getByRole('button',{name:uiCopy.en.emergencyExport,exact:true}).click();const file=`${evidence}/raw-cancel-${cancellation}.json`;await(await pending).saveAs(file);await expect.poll(()=>active.size).toBe(0);expect(downloads).toBe(1);const recovered=inspectRecovery(await readFile(file,'utf8'));const profiles=recovered.stores.find((store:any)=>store.name==='profile');expect(profiles.values.some((profile:any)=>Number.isNaN(profile.wallet))).toBe(true);const attempts=recovered.stores.find((store:any)=>store.name==='attempts');expect(attempts.values.some((attempt:any)=>attempt.id===roleAttempt(original,'quick').id)).toBe(true);
});

for(const locale of ['en','de','es'] as const)test(`simulated attempt-write quota exports current RAM without loading raw recovery ${locale}`,async({page})=>{
  await page.goto('/');await quick(page,'Easy');await settings(page);await page.getByRole('combobox').first().selectOption(locale);await expect(page.getByRole('heading',{name:uiCopy[locale].settings,exact:true})).toBeVisible();await closeDialogs(page);const original=roleAttempt(await snapshot(page),'quick'),puzzle=await domPuzzle(page),cell=puzzle.givens.indexOf('0'),value=Number(puzzle.solution[cell]);const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
  await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;(window as any).__restoreRecoveryPut=()=>IDBObjectStore.prototype.put=original;IDBObjectStore.prototype.put=function(...args:any[]){if(this.name==='attempts')throw new DOMException('Explicit test quota simulation','QuotaExceededError');return Reflect.apply(original,this,args);};});
  try{
    await digit(page,cell,value);await expect(page.locator('.dock .more')).toContainText(appCopy[locale].unsavedShort);await more(page);await page.getByRole('button',{name:uiCopy[locale].notes,exact:true}).click();await badgeFits(page,locale,'unsavedShort');await more(page);await expect(page.getByRole('dialog').getByRole('status')).toHaveText(uiCopy[locale].unsaved);const pending=page.waitForEvent('download');await page.getByRole('dialog').getByRole('button',{name:uiCopy[locale].emergencyExport,exact:true}).click();const file=`${evidence}/simulated-quota-local-recovery-${locale}.json`;await(await pending).saveAs(file);const artifact=JSON.parse(await readFile(file,'utf8'));expect(artifact.kind).toBe('toadodu-emergency-recovery');expect(artifact.importableBackup).toBe(false);expect(artifact.durableReadback).toBe('not-requested');expect(artifact.localAttempt.id).toBe(original.id);expect(artifact.localAttempt.entries[cell]).toBe(value);expect(requests.filter(url=>/\/(?:raw-recovery|raw-recovery\.worker)-/.test(url))).toHaveLength(0);expect(roleAttempt(await snapshot(page),'quick').entries[cell]).toBe(0);
  }finally{await page.evaluate(()=>(window as any).__restoreRecoveryPut());}
});

for(const locale of ['en','de','es'] as const)test(`explicit unscored play keeps its full badge and blocks progression ${locale}`,async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.goto('/__recovery_fault_setup__.html');await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('toadodu:%2F',7);request.onupgradeneeded=()=>request.result.createObjectStore('future');request.onerror=()=>reject(request.error);request.onsuccess=()=>{request.result.close();resolve();};}));await page.goto(`/?lang=${locale}`);await page.getByRole('button',{name:appCopy[locale].unscored,exact:true}).click();await page.getByRole('button',{name:uiCopy[locale].easy,exact:true}).click();await board(page);await more(page);await expect(page.getByRole('dialog')).toContainText(uiCopy[locale].unscoredIdentity);await page.getByRole('button',{name:uiCopy[locale].notes,exact:true}).click();await badgeFits(page,locale,'unscoredShort');await more(page);await page.getByRole('button',{name:uiCopy[locale].settings,exact:true}).click();await page.locator('summary').click();await expect(page.locator('dl')).toContainText('0');await closeDialogs(page);await more(page);await page.getByRole('button',{name:uiCopy[locale].mainMenu,exact:true}).click();await expect(page.getByRole('button',{name:uiCopy[locale].frontier,exact:true})).toBeDisabled();
});

for(const locale of ['en','de','es'] as const)test(`ordinary Notes mode keeps its full localized dock label ${locale}`,async({page})=>{
  await page.goto('/');await quick(page,'Easy');await settings(page);await page.getByRole('combobox').first().selectOption(locale);await expect(page.getByRole('heading',{name:uiCopy[locale].settings,exact:true})).toBeVisible();await closeDialogs(page);await more(page);await page.getByRole('button',{name:uiCopy[locale].notes,exact:true}).click();
  for(const[width,height]of[[320,568],[568,320]]){await page.setViewportSize({width,height});await expect(page.locator('.dock')).toHaveClass(width>height?/landscape/:/^(?!.*landscape)/);const button=page.locator('.dock .more'),label=button.locator('.notes-mode');await expect(label).toHaveText(uiCopy[locale].notes);const metrics=await label.evaluate(element=>{const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),textRects:any[]=[];while(walker.nextNode()){if(!walker.currentNode.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(walker.currentNode);textRects.push(...[...range.getClientRects()].map(rect=>rect.toJSON()));}return {font:getComputedStyle(element).fontSize,textRects,icons:[...element.closest('button')!.querySelectorAll('svg')].map(svg=>svg.getBoundingClientRect().toJSON()),control:element.closest('button')!.getBoundingClientRect().toJSON()};});await writeFile(`${evidence}/notes-label-${locale}-${width}x${height}.json`,JSON.stringify(metrics));expect(parseFloat(metrics.font)).toBeGreaterThanOrEqual(11);for(const rect of [...metrics.textRects,...metrics.icons]){expect(rect.left).toBeGreaterThanOrEqual(metrics.control.left);expect(rect.top).toBeGreaterThanOrEqual(metrics.control.top);expect(rect.right).toBeLessThanOrEqual(metrics.control.right);expect(rect.bottom).toBeLessThanOrEqual(metrics.control.bottom);}}
});

test('failed raw worker retains the newest local attempt and announces a partial recovery',async({page})=>{
  await page.goto('/');await quick(page,'Easy');const original=roleAttempt(await snapshot(page),'quick'),puzzle=await domPuzzle(page),cell=puzzle.givens.indexOf('0'),value=Number(puzzle.solution[cell]);
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('toadodu:%2F');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta'),read=store.get('current');read.onsuccess=()=>store.put({...read.result,essentialRevision:NaN},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};}));
  await digit(page,cell,value);await expect(page.locator('.dock .more')).toContainText(appCopy.en.unsavedShort);await more(page);let blocked=0;await page.route('**/assets/raw-recovery.worker-*.js',route=>{blocked++;return route.fulfill({status:404,body:'explicit missing worker'});});const pending=page.waitForEvent('download');await page.getByRole('dialog').getByRole('button',{name:uiCopy.en.emergencyExport,exact:true}).click();const file=`${evidence}/partial-local-recovery.json`;await(await pending).saveAs(file);expect(blocked).toBeGreaterThan(0);const artifact=JSON.parse(await readFile(file,'utf8'));expect(artifact.kind).toBe('toadodu-emergency-recovery');expect(artifact.importableBackup).toBe(false);expect(artifact.localAttempt.id).toBe(original.id);expect(artifact.localAttempt.entries[cell]).toBe(value);await expect(page.getByRole('dialog').getByRole('status').filter({hasText:uiCopy.en.recoveryPartial})).toHaveCount(1);
});

for (const cancellation of ['Close','Escape','Back'] as const) test(`actual backup preview worker cancels with ${cancellation} and a fresh preview still works`, async ({ page }) => {
  test.setTimeout(60000); await page.goto('/'); await quick(page,'Easy'); await settings(page); await page.getByRole('button',{name:'Backup',exact:true}).click();
  const downloaded=page.waitForEvent('download'); await page.getByRole('button',{name:'Export backup',exact:true}).click(); const file=`${evidence}/cancellation-${cancellation}.json`; await(await downloaded).saveAs(file);
  const before=await snapshot(page); let release!:()=>void, finish!:()=>void, nativeWorkers=0, closedWorkers=0;const activeWorkers=new Set<BrowserWorker>(); const released=new Promise<void>(resolve=>release=resolve), finished=new Promise<void>(resolve=>finish=resolve); const gate:WorkerGate={seen:0,aborted:false,released,release,finished,finish};workerGate=gate;page.on('worker',worker=>{if(/backup\.worker-/.test(worker.url())){nativeWorkers++;activeWorkers.add(worker);worker.on('close',()=>{closedWorkers++;activeWorkers.delete(worker);});}});
  await page.getByLabel('Choose backup file',{exact:true}).setInputFiles(file); await page.getByRole('button',{name:'Preview restore',exact:true}).click(); await expect.poll(()=>gate.seen).toBe(1);
  await expect(page.getByRole('button',{name:'Close',exact:true})).toBeEnabled(); await expect(page.getByRole('button',{name:'Back',exact:true})).toBeEnabled(); await expect(page.getByRole('button',{name:'Export backup',exact:true})).toBeDisabled();
  if(cancellation==='Escape')await page.keyboard.press('Escape');else await page.getByRole('button',{name:cancellation,exact:true}).click();
  await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible(); gate.release(); await gate.finished; workerGate=undefined; await page.evaluate(()=>Promise.resolve()); await expect.poll(()=>activeWorkers.size).toBe(0); console.log(`N001 ${cancellation}: released canceled unchanged worker response ${gate.url}, transportAborted=${gate.aborted}, nativeCreated=${nativeWorkers}, nativeClosed=${closedWorkers}`);
  await page.getByRole('button',{name:'Backup',exact:true}).click(); await expect(page.getByRole('button',{name:'Replace with this backup',exact:true})).toHaveCount(0); await expect(page.getByRole('alert')).toHaveCount(0);
  const after=await snapshot(page); expect(after.meta.generation).toBe(before.meta.generation); expect(after.profile.wallet).toBe(before.profile.wallet); expect(after.roles.map(role=>role.attemptId)).toEqual(before.roles.map(role=>role.attemptId));
  const createdBeforeFresh=nativeWorkers,closedBeforeFresh=closedWorkers;await page.getByLabel('Choose backup file',{exact:true}).setInputFiles(file);const preview=page.getByRole('button',{name:'Preview restore',exact:true});await preview.focus();await expect(preview).toBeFocused();await preview.press('Enter'); await expect(page.getByRole('button',{name:'Replace with this backup',exact:true})).toBeEnabled(); expect(nativeWorkers).toBe(createdBeforeFresh+1);await expect.poll(()=>closedWorkers).toBe(closedBeforeFresh+1);await expect.poll(()=>activeWorkers.size).toBe(0); await expect(page.getByRole('heading',{name:'Review backup',exact:true})).toBeFocused();
  await page.getByLabel('Choose backup file',{exact:true}).setInputFiles([]); await expect(page.getByRole('button',{name:'Replace with this backup',exact:true})).toHaveCount(0);
});

test('actual responsive tools and sheets retain every action across locales and orientations', async ({ page }) => {
  test.setTimeout(120000); await page.goto('/'); await quick(page, 'Easy'); const puzzle = await domPuzzle(page), cell = puzzle.givens.indexOf('0');
  await notesMode(page, true); for (let number = 1; number <= 9; number++) await digit(page, cell, number);
  async function fits(width: number, height: number, label: string) {
    const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); const box = await dialog.boundingBox();
    expect(box!.x, label).toBeGreaterThanOrEqual(0); expect(box!.y, label).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width, label).toBeLessThanOrEqual(width); expect(box!.y + box!.height, label).toBeLessThanOrEqual(height);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), `${label}: no horizontal clipping`).toBe(true);
  }
  for (const locale of ['en','de','es'] as const) {
    await settings(page); await page.getByRole('combobox').first().selectOption(locale); await expect(page.getByRole('heading', { name: uiCopy[locale].settings, exact: true })).toBeVisible(); await closeDialogs(page);
    for (const [width,height] of [[360,800],[800,360],[320,568],[568,320],[768,1024],[1280,720]]) {
      await page.setViewportSize({ width,height }); await more(page); await fits(width,height,`More ${locale} ${width}x${height}`);
      const tools = await page.getByRole('heading',{name:uiCopy[locale].tools,exact:true}).boundingBox(), menu = await page.getByRole('heading',{name:uiCopy[locale].menu,exact:true}).boundingBox(); expect(tools!.x).toBeLessThan(menu!.x);
      await page.screenshot({path:`${evidence}/actual-more-${locale}-${width}x${height}.png`});
      await page.getByRole('button',{name:uiCopy[locale].largerCell,exact:true}).click(); await expect(page.locator('.note-specimen span')).toHaveCount(9); await fits(width,height,'Notes'); await closeDialogs(page);
      await settings(page); await fits(width,height,'Settings'); await page.getByRole('button',{name:uiCopy[locale].backup,exact:true}).click(); await fits(width,height,'Backup'); await closeDialogs(page);
    }
  }
  await settings(page); await page.getByRole('combobox').first().selectOption('en'); await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible(); await closeDialogs(page); await solve(page);
  for (const [width,height] of [[360,800],[800,360],[320,568],[568,320],[768,1024],[1280,720]]) { await page.setViewportSize({width,height}); await fits(width,height,'Actual completed result'); await page.screenshot({path:`${evidence}/actual-result-${width}x${height}.png`}); }
  await page.setViewportSize({width:320,height:568}); await page.evaluate(() => document.documentElement.style.fontSize='200%'); await fits(320,568,'Actual result 200% CSS text simulation'); await closeDialogs(page); await more(page); await fits(320,568,'Actual More 200% CSS text simulation'); await page.getByRole('button',{name:'Settings',exact:true}).click(); await fits(320,568,'Actual Settings 200% CSS text simulation');
});

test('representative DPR3 touch journeys preserve values and all nine notes across rotation',async({browser,browserName})=>{
  test.setTimeout(60000);const context=await browser.newContext({baseURL:'http://127.0.0.1:5191',viewport:{width:360,height:800},deviceScaleFactor:3,hasTouch:true,isMobile:browserName!=='firefox'});const page=await context.newPage();
  await context.addInitScript(()=>{(window as any).__observedTrustedTouches=0;addEventListener('touchstart',event=>{if(event.isTrusted&&event.touches.length>0)(window as any).__observedTrustedTouches++;},{capture:true,passive:true});});
  try{await page.goto('/');await page.getByRole('button',{name:'Quick Play',exact:true}).tap();await page.getByRole('button',{name:'Easy',exact:true}).tap();await board(page);const puzzle=await domPuzzle(page),blanks=[...puzzle.givens].map((digit,cell)=>digit==='0'?cell:-1).filter(cell=>cell>=0),entry=blanks[0],noted=blanks[1];
    await page.locator(`[data-cell="${entry}"]`).tap();await page.getByRole('button',{name:puzzle.solution[entry],exact:true}).tap();await waitForDurableEntry(page,'quick',entry,Number(puzzle.solution[entry]));
    await page.locator('.dock .more').tap();await page.getByRole('button',{name:'Notes',exact:true}).tap();await expect(page.getByRole('dialog')).toHaveCount(0);await page.locator(`[data-cell="${noted}"]`).tap();for(let digit=1;digit<=9;digit++)await page.getByRole('button',{name:String(digit),exact:true}).tap();await expect.poll(async()=>roleAttempt(await snapshot(page),'quick').notes[noted]).toBe(511);const saved=roleAttempt(await snapshot(page),'quick');
    const observations=[];
    for(const[width,height]of[[360,800],[800,360]]){await page.setViewportSize({width,height});await expect(page.locator('.dock')).toHaveClass(width>height?/landscape/:/^(?!.*landscape)/);await page.locator(`[data-cell="${noted}"]`).tap();await page.locator('.dock .more').tap();await page.getByRole('button',{name:'Cell and notes',exact:true}).tap();await expect(page.locator('.note-specimen span')).toHaveCount(9);for(const key of await page.locator('.large-keys button').all()){const box=await key.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);}await page.screenshot({path:`${evidence}/g31-g32-css-emulation-${browserName}-${width}x${height}-dpr3.png`});observations.push(await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,touches:navigator.maxTouchPoints,userAgent:navigator.userAgent})));await closeDialogs(page);}
    const trustedTouchEvents=await page.evaluate(()=>(window as any).__observedTrustedTouches);expect(trustedTouchEvents).toBeGreaterThan(0);expect(observations.every(observation=>observation.dpr===3)).toBe(true);const after=roleAttempt(await snapshot(page),'quick');expect(after.id).toBe(saved.id);expect(after.entries).toEqual(saved.entries);expect(after.notes).toEqual(saved.notes);await writeFile(`${evidence}/touch-${browserName}.json`,JSON.stringify({representativeCssEmulation:true,hardwareTested:false,isMobile:browserName!=='firefox',trustedTouchEvents,reportedTouchCapabilityLimitation:observations.some(observation=>observation.touches===0),observations}));
  }finally{await context.close();}
});

test('all sixty genuine frontier puzzles, exported boundary saves and fresh Leap 60 replay preserve the frontier', async ({ page }) => {
  test.setTimeout(420000); await page.setViewportSize({ width: 800, height: 360 }); await page.goto('/'); await page.getByRole('button', { name: 'Progression', exact: true }).click(); await page.getByRole('button', { name: 'Start', exact: true }).click(); await board(page);
  const boundaries = new Set([6,15,24,42,60]);
  for (let leap = 1; leap <= 60; leap++) {
    const before = await snapshot(page), attempt = roleAttempt(before, 'frontier'); expect(attempt.binding?.leap).toBe(leap); expect(before.profile.frontier.metamorphosis).toBe(1);
    if (boundaries.has(leap)) await exportUiBackup(page, `boundary-${leap}.json`);
    await solve(page); const completed = await snapshot(page); expect(completed.receipts).toHaveLength(leap); expect(roleAttempt(completed, 'frontier').id).toBe(attempt.id); expect(completed.profile.frontier.leap).toBe(leap === 60 ? 1 : leap + 1); expect(completed.profile.frontier.metamorphosis).toBe(leap === 60 ? 2 : 1);
    console.log(`B001 genuine frontier completion ${leap}/60, wallet ${completed.profile.wallet}`);
    if (leap === 60) { await closeDialogs(page); await exportUiBackup(page, 'after-60-retained-result.json'); console.log('B001 after-60 retained-result backup exported through UI'); await more(page); await page.getByRole('dialog').getByRole('button', { name: 'View result', exact: true }).click(); }
    try{await page.getByRole('dialog').getByRole('button', { name: 'Continue', exact: true }).click();}catch(error){const ui=await page.evaluate(()=>({url:location.href,history:history.state,dialogs:[...document.querySelectorAll('dialog')].map(dialog=>({open:dialog.open,title:dialog.querySelector('h2')?.textContent,buttons:[...dialog.querySelectorAll('button')].map(button=>({text:button.textContent,disabled:button.disabled}))})),cells:document.querySelectorAll('.cell').length,active:document.activeElement?.outerHTML.slice(0,600)}));const durable=await snapshot(page);await writeFile(`${evidence}/continue-failure-${leap}.json`,JSON.stringify({leap,ui,meta:durable.meta,profile:durable.profile,roles:durable.roles,attempts:durable.attempts.map(attempt=>({id:attempt.id,role:attempt.role,status:attempt.status,receiptId:attempt.receiptId})),receipts:durable.receipts.map(receipt=>({id:receipt.id,attemptId:receipt.attemptId}))},null,2));console.error('B001 Continue failure',JSON.stringify({leap,ui}));throw error;}await expect(page.getByRole('dialog')).toHaveCount(0); await board(page);
  }
  console.log('B001 new Metamorphosis2 frontier allocated');
  const next = roleAttempt(await snapshot(page), 'frontier'), nextPuzzle = await domPuzzle(page), cell = nextPuzzle.givens.indexOf('0'); await digit(page, cell, Number(nextPuzzle.solution[cell])); await waitForDurableEntry(page, 'frontier', cell, Number(nextPuzzle.solution[cell]));
  const beforeReplay = await snapshot(page), preserved = roleAttempt(beforeReplay, 'frontier'), preservedFrontier = beforeReplay.profile.frontier; await mainMenu(page); await page.getByRole('button', { name: 'Progression', exact: true }).click(); await page.getByRole('button', { name: 'Completed Leaps', exact: true }).click(); await page.getByRole('combobox', { name: 'Choose a completed Leap', exact: true }).selectOption('60'); await page.getByRole('dialog').getByRole('button', { name: 'Start replay', exact: true }).click(); await board(page);
  console.log('B001 Leap60 replay allocated'); const replay = roleAttempt(await snapshot(page), 'replay'); expect(replay.binding?.leap).toBe(60); expect(replay.definition.id).not.toBe(preserved.definition.id); await solve(page); console.log('B001 Leap60 replay completed');
  const afterReplay = await snapshot(page); expect(afterReplay.profile.frontier).toEqual(preservedFrontier); expect(afterReplay.profile.frontier.metamorphosis).toBe(2); expect(afterReplay.profile.frontier.leap).toBe(1); expect(afterReplay.receipts).toHaveLength(61); expect(roleAttempt(afterReplay, 'frontier').entries).toEqual(preserved.entries);
  await closeDialogs(page); await mainMenu(page); await page.getByRole('button', { name: 'Progression', exact: true }).click(); await page.getByRole('button', { name: 'Completed Leaps', exact: true }).click(); await page.getByRole('combobox', { name: 'Choose a completed Leap', exact: true }).selectOption('6');
  await page.getByRole('button', { name: uiCopy.en.continueLeap(6), exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await board(page);
  const continuedReplay = await snapshot(page); expect(roleAttempt(continuedReplay, 'replay').binding?.leap).toBe(6); expect(new Set(continuedReplay.issued.map(record=>record.id)).size).toBe(new Set(afterReplay.issued.map(record=>record.id)).size + 1); expect(new Set(continuedReplay.issued.map(record=>record.groupId)).size).toBe(new Set(afterReplay.issued.map(record=>record.groupId)).size + 1); expect(continuedReplay.receipts).toHaveLength(61); expect(continuedReplay.profile.frontier).toEqual(preservedFrontier); expect(roleAttempt(continuedReplay, 'frontier').entries).toEqual(preserved.entries);
  await closeDialogs(page); await mainMenu(page); await page.getByRole('button', { name: 'Progression', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).click(); await board(page); expect(roleAttempt(await snapshot(page), 'frontier').id).toBe(preserved.id);
  await page.screenshot({ path: `${evidence}/metamorphosis-2-frontier-after-replay.png` });
});
