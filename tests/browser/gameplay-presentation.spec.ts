import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { uiCopy } from '../../src/lib/gameplay/ui/copy';
const evidence = 'prototypes/gameplay-validation/ui';
const fixtureId=`harness-${Date.now()}-${process.pid}`;
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
  await writeFile(`${evidence}/${fixtureId}.html`, `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="./${fixtureId}.ts"></script></body></html>`);
  await writeFile(`${evidence}/${fixtureId}.ts`, `import { mount } from 'svelte';import Harness from './${fixtureId}.svelte';mount(Harness,{target:document.getElementById('app')!});`);
  // Isolated UI fixture only. It is neither catalog provenance nor durable reward evidence.
  await writeFile(`${evidence}/${fixtureId}.svelte`, String.raw`<script lang="ts">
    import { tick } from 'svelte';
    import GameDialog from '/src/lib/gameplay/ui/GameDialog.svelte';
    import { themeStyle } from '/src/lib/theme/pond';
    import '/src/lib/theme/fonts.css';
    import { attemptFixture } from '/tests/session/fixtures';
    import { reduceAttempt } from '/src/lib/session';
    import { rewardForAttempt } from '/src/lib/rewards';
    const params=new URLSearchParams(location.search);let view=$state(params.get('view')??'more');let open=$state(true);let attempt=$state(attemptFixture());
    let preferences=$state({schemaVersion:1,language:params.get('locale')??'en',motion:'reduced',boardShape:'fill',theme:'pond',appearance:'light'});
    attempt.notes[1]=511;attempt.elapsedMs=300000;
    attempt.status=params.get('attemptstatus')??'playing';
    attempt.scored=!params.has('unscored');
    const profile={revision:0,wallet:105,lifetimeEarned:105,frontier:{runId:'fixture',metamorphosis:1,leap:2,scheduleVersion:1},highestCompletedLeap:1};
    const replayAttempt=params.has('replaystatus')?{...attempt,role:'replay',status:params.get('replaystatus'),binding:{...profile.frontier,leap:1}}:undefined;let restorePreview=$state<any>();let hint=$state<any>();let hintProblem=$state<any>();let hintBusy=$state(false);let exportBusy=$state(false);let recoveryPending=$state(false);
    const landscape=innerWidth>innerHeight;const anchor=params.has('anchor')?(landscape?{left:innerWidth-104,top:8,width:96,height:innerHeight-16,landscape}:{left:8,top:innerHeight-104,width:innerWidth-16,height:96,landscape}):undefined;
    const receipt={schemaVersion:1,id:'test',attemptId:attempt.id,generation:attempt.generation,puzzleId:attempt.definition.id,groupId:attempt.definition.groupId,role:'quick',scored:attempt.scored,policy:attempt.policy,result:rewardForAttempt(attempt)};
    (window as any).uiEvents=[];
    async function getHint(kind:any){(window as any).uiEvents.push({hint:kind});if(!params.has('hintcase'))return;hintBusy=true;if(params.has('hintdelay'))await new Promise(resolve=>setTimeout(resolve,500));hintBusy=false;if(params.get('hintcase')==='ready')hint={kind:'reveal',logicalRevision:attempt.logicalRevision,cell:attempt.selection,digit:Number(attempt.definition.solution[attempt.selection])};else hintProblem=params.get('hintcase');}
    async function doExport(kind:any){(window as any).uiEvents.push({export:kind});if(!params.has('exportdelay'))return;if(kind==='recovery')recoveryPending=true;else exportBusy=true;await new Promise(resolve=>setTimeout(resolve,500));exportBusy=false;recoveryPending=false;}
    async function command(value:any){(window as any).uiEvents.push(value);const result=reduceAttempt(attempt,value);if(result.kind==='changed')attempt=result.attempt;if(params.has('commanddelay')){await new Promise(resolve=>setTimeout(resolve,500));if(params.has('commandreplace')){attempt={...attempt,id:'new-fixture-attempt'};open=false;await tick();document.getElementById('underlying')?.focus();}(window as any).uiEvents.push('command-settled');}}
    function close(reason:any){(window as any).uiEvents.push({close:reason});if(view==='more')open=false;else view='more';}
  </script>
  <main style={themeStyle()}><button id="underlying" onclick={()=>(window as any).uiEvents.push('underlying')}>Underlying</button>{#if open}<GameDialog {view} locale={preferences.language} {attempt} {replayAttempt} {profile} {preferences} preferencesAvailable={!params.has('noprefs')} {receipt} continueBand={params.get('continueband')??undefined} {hint} {hintProblem} {anchor} {restorePreview} busy={params.has('busy')||hintBusy||exportBusy||recoveryPending} closingBlocked={params.has('blocked')} saveState={params.get('save')??'saved'} exportError={params.has('exporterror')} recoveryBusy={params.has('recoverybusy')||recoveryPending} recoveryProblem={params.get('recoveryproblem')??undefined} onRestoreInput={()=>{(window as any).uiEvents.push('restore-input');}} onRecovery={async()=>{(window as any).uiEvents.push('recovery');await doExport('recovery');}} onResumeSaved={(confirm)=>{(window as any).uiEvents.push({resumeSaved:confirm});}} onCommand={command} onNavigate={(next)=>view=next} onClose={close} onPreference={(next)=>preferences=next} onHint={getHint} onContinue={()=>close('continue')} onReplay={()=>{}} onRestart={()=>{}} onExport={()=>doExport('backup')} onRestore={(_,confirm)=>{if(!confirm)restorePreview={replaceWallet:105,importedWallet:105,activeAttempts:1,receipts:1,issued:2};}} />{/if}</main>
  <style>:global(body){margin:0;background:#0D6267}main{min-height:100dvh}</style>`);
});
const route = (view: string, locale = 'en') => `/prototypes/gameplay-validation/ui/${fixtureId}.html?view=${view}&locale=${locale}`;
test('compact tools stay left and menu stays right with actual keyboard containment', async ({ page }) => {
  for (const [width, height] of [[320,568],[360,800],[800,360],[1280,720]]) for (const locale of ['en','de','es'] as const) {
    await page.setViewportSize({ width, height }); await page.goto(route('more', locale));
    const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
    const tools = await page.getByRole('heading', { name: uiCopy[locale].tools, exact: true }).boundingBox(), menu = await page.getByRole('heading', { name: uiCopy[locale].menu, exact: true }).boundingBox();
    expect(tools!.x).toBeLessThan(menu!.x);
    const box = await dialog.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width); expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    expect(box!.x + box!.width).toBe(width - 8); expect(box!.y + box!.height).toBe(height - 8);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await dialog.evaluate(el=>{const style=getComputedStyle(el);return new Set([style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomLeftRadius,style.borderBottomRightRadius]).size;})).toBe(1);
    const close = page.getByRole('button', { name: uiCopy[locale].close, exact: true }); const target = await close.boundingBox(); expect(target!.width).toBeGreaterThanOrEqual(44); expect(target!.height).toBeGreaterThanOrEqual(44);
    for (let i = 0; i < 15; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true); }
    await page.screenshot({ path: `${evidence}/more-${width}x${height}-${locale}.png` });
  }
});
test('supplied dock anchors place compact popovers exactly eight pixels toward the board', async ({ page }) => {
  for (const [width, height] of [[360,800],[800,360]]) {
    await page.setViewportSize({ width, height }); await page.goto(`${route('more')}&anchor=1`);
    const box = await page.getByRole('dialog').boundingBox();
    if (width > height) { expect(box!.x + box!.width).toBe(width - 112); expect(box!.y + box!.height).toBe(height - 8); }
    else { expect(box!.x + box!.width).toBe(width - 8); expect(box!.y + box!.height).toBe(height - 112); }
  }
  // The fixture deliberately retains old anchor coordinates while CSS sees the new viewport.
  for (const locale of ['en','de','es']) {
    await page.setViewportSize({ width: 800, height: 360 }); await page.goto(`${route('more', locale)}&anchor=1`);
    for (const [width, height] of [[360,800],[568,320],[320,568],[1024,768],[1280,720],[800,360]]) {
      await page.setViewportSize({ width, height }); const box = await page.getByRole('dialog').boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(8); expect(box!.y).toBeGreaterThanOrEqual(8); expect(box!.x + box!.width).toBeLessThanOrEqual(width - 8); expect(box!.y + box!.height).toBeLessThanOrEqual(height - 8);
    }
  }
});
test('enlarged manual notes use the same reducer and all nine marks remain readable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await page.goto(route('notes'));
  await expect(page.locator('.note-specimen span')).toHaveCount(9); expect(await page.locator('.note-specimen').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(24);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  const note = page.getByRole('button', { name: 'Note 5', exact: true }); await expect(note).toHaveAttribute('aria-pressed', 'true'); await note.click(); await expect(note).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(note).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => (window as unknown as { uiEvents: unknown[] }).uiEvents)).toContainEqual({ type: 'enter', digit: 5 });
});
test('larger task sheets reflow with 200 percent text simulation and show only Dewdrops', async ({ page }) => {
  for (const locale of ['en', 'de', 'es'] as const) for (const view of ['settings', 'notes', 'hint', 'result', 'backup', 'replay']) {
    await page.setViewportSize({ width: 320, height: 568 }); await page.goto(route(view, locale));
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), `${view}/${locale} reflows at simulated 200% text`).toBe(true);
    expect(await dialog.evaluate(el=>{const style=getComputedStyle(el);return [style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomLeftRadius,style.borderBottomRightRadius].every(radius=>radius===style.getPropertyValue('--dialog-radius').trim());})).toBe(true);
    await page.getByRole('button', { name: uiCopy[locale].close, exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidence}/${view}-320x568-${locale}-200text-simulation.png` });
    if (view === 'result') { await expect(dialog).toContainText('105'); await expect(dialog).not.toContainText('1050'); await expect(dialog).not.toContainText('Score'); }
  }
});
test('backup picker keeps a full equivalent target and native keyboard focus with long escaped filenames', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await page.goto(route('backup', 'es'));
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  const picker = page.getByLabel(uiCopy.es.chooseFile, { exact: true }); await picker.focus();
  expect(await page.locator('.file-label').evaluate(el => el.matches(':focus-within'))).toBe(true);
  const bounds = await page.locator('.file-label').boundingBox(); expect(bounds!.height).toBeGreaterThanOrEqual(44);
  const name = `${'Sicherung-á'.repeat(30)}<svg>.json`;
  await picker.setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.locator('.file-name')).toHaveText(name); await expect(page.locator('.file-name svg')).toHaveCount(0);
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.getByRole('button', { name: uiCopy.es.preview, exact: true })).toBeEnabled();
});
test('replay and restore respect pending results and exact preview identity', async ({ page }) => {
  for (const status of ['pending-completion', 'completed']) {
    await page.goto(`${route('replay')}&replaystatus=${status}`);
    if (status === 'pending-completion') await expect(page.getByRole('button', { name: uiCopy.en.startReplay, exact: true })).toBeDisabled();
    else { await expect(page.getByRole('button', { name: uiCopy.en.startReplay, exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: uiCopy.en.continueLeap(1), exact: true })).toBeEnabled(); }
    await expect(page.getByRole('button', { name: uiCopy.en.resumeReplay, exact: true })).toBeEnabled();
  }
  await page.goto(route('backup')); const picker = page.getByLabel(uiCopy.en.chooseFile, { exact: true });
  await picker.setInputFiles({ name: 'first.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await page.getByRole('button', { name: uiCopy.en.preview, exact: true }).click(); await expect(page.getByRole('button', { name: uiCopy.en.confirmRestore, exact: true })).toBeVisible(); await expect(page.getByRole('heading',{name:uiCopy.en.reviewBackup,exact:true})).toBeFocused(); await expect(page.getByRole('button',{name:uiCopy.en.confirmRestore,exact:true})).not.toBeFocused();
  await picker.setInputFiles([]); await expect(page.getByRole('button', { name: uiCopy.en.confirmRestore, exact: true })).toHaveCount(0); expect(await page.evaluate(() => (window as any).uiEvents.filter((item: unknown) => item === 'restore-input'))).toHaveLength(2);
});
test('completed menus retain results and session disclosure remains keyboard accessible', async ({ page }) => {
  await page.goto(`${route('more')}&attemptstatus=completed`);
  await expect(page.getByRole('button', { name: uiCopy.en.hint, exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: uiCopy.en.pause, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: uiCopy.en.viewResult, exact: true }).click(); await expect(page.getByRole('heading', { name: uiCopy.en.completed, exact: true })).toBeVisible();
  await page.goto(route('settings')); const summary = page.locator('summary'); await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('details')).toHaveAttribute('open', ''); await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: uiCopy.en.backup, exact: true })).toBeFocused();
  await page.getByRole('button', { name: uiCopy.en.newPuzzle, exact: true }).click(); await expect(page.getByRole('heading', { name: uiCopy.en.replaceTitle, exact: true })).toBeVisible();
});

test('critical transitions block dismissal while hint computation stays cancellable', async ({ page }) => {
  await page.goto(`${route('settings')}&noprefs=1`); await expect(page.getByRole('combobox')).toHaveCount(3); for(const select of await page.getByRole('combobox').all())await expect(select).toBeDisabled();await expect(page.getByRole('button',{name:uiCopy.en.backup,exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:uiCopy.en.back,exact:true})).toBeEnabled();
  await page.goto(`${route('settings')}&busy=1&blocked=1`);
  await expect(page.getByRole('button', { name: uiCopy.en.close, exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: uiCopy.en.back, exact: true })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(page.getByRole('heading', { name: uiCopy.en.settings, exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).uiEvents)).toEqual([]);
  await page.goto(`${route('hint')}&busy=1`);
  await expect(page.getByRole('button', { name: uiCopy.en.close, exact: true })).toBeEnabled();
  await page.keyboard.press('Escape'); await expect(page.getByRole('heading', { name: uiCopy.en.game, exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).uiEvents)).toContainEqual({ close: 'dismiss' });
});

test('unscored lineage and emergency recovery remain explicit in every locale', async ({ page }) => {
  for (const locale of ['en','de','es'] as const) {
    await page.goto(`${route('more', locale)}&unscored=1&save=unsaved`);
    await expect(page.getByRole('dialog')).toContainText(uiCopy[locale].unscoredIdentity);
    await expect(page.getByRole('dialog')).toContainText(uiCopy[locale].emergencyHelp);
    await page.getByRole('button', { name: uiCopy[locale].emergencyExport, exact: true }).click();
    expect(await page.evaluate(() => (window as any).uiEvents)).toContain('recovery');
    await expect(page.getByRole('status')).toHaveText(uiCopy[locale].unsaved);
    await page.goto(`${route('result', locale)}&unscored=1`); await expect(page.getByRole('dialog')).toContainText(uiCopy[locale].unscoredIdentity);
    await page.goto(`${route('backup', locale)}&save=conflict`);
    await expect(page.getByRole('button', { name: uiCopy[locale].emergencyExport, exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: uiCopy[locale].export, exact: true })).toHaveCount(1); await page.goto(`${route('backup', locale)}&exporterror=1`); await expect(page.getByRole('alert')).toHaveText(uiCopy[locale].exportFailed); await expect(page.getByRole('button', {name:uiCopy[locale].emergencyExport,exact:true})).toBeVisible();
  }
});

test('conflicted local recovery requires its explicit saved-puzzle choice without duplicate export',async({page})=>{
  for(const locale of ['en','de','es'] as const){await page.goto(`${route('recover',locale)}&save=conflict`);await expect(page.getByRole('heading',{name:uiCopy[locale].recoverTitle,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:uiCopy[locale].emergencyExport,exact:true})).toHaveCount(1);await expect(page.getByRole('button',{name:uiCopy[locale].back,exact:true})).toHaveCount(0);expect(await page.evaluate(()=>(window as any).uiEvents)).toEqual([]);await page.getByRole('button',{name:uiCopy[locale].resumeSaved,exact:true}).click();expect(await page.evaluate(()=>(window as any).uiEvents)).toEqual([{resumeSaved:true}]);}
});

test('hint outcomes announce status and focus acknowledged results without stealing Close focus',async({page})=>{
  for(const locale of ['en','de','es'] as const){
    await page.goto(`${route('hint',locale)}&hintcase=ready`);const logical=page.getByRole('button',{name:uiCopy[locale].logicalHint,exact:true});await logical.focus();await logical.press('Enter');await expect(page.locator('#hint-result-title')).toBeFocused();await expect(page.getByRole('status')).toHaveText(uiCopy[locale].hintReady);
    for(const problem of ['no-step','unavailable']){await page.goto(`${route('hint',locale)}&hintcase=${problem}`);await page.getByRole('button',{name:uiCopy[locale].logicalHint,exact:true}).click();await expect(page.getByRole('status')).toHaveText(problem==='no-step'?uiCopy[locale].noStep:uiCopy[locale].hintUnavailable);await expect(page.locator('#hint-result-title')).toHaveCount(0);}
  }
  await page.goto(`${route('hint')}&hintcase=ready&hintdelay=1`);const logical=page.getByRole('button',{name:uiCopy.en.logicalHint,exact:true});await logical.focus();await logical.press('Enter');await expect(logical).toBeDisabled();const close=page.getByRole('button',{name:uiCopy.en.close,exact:true});await close.focus();await expect(page.locator('#hint-result-title')).toHaveCount(0);await expect(page.getByRole('status')).toHaveText(uiCopy.en.hintReady);await expect(close).toBeFocused();
});

test('manual recovery status stays concise and raw work remains dismissible',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  for(const locale of ['en','de','es'] as const){
    for(const problem of ['partial','unavailable'] as const){
      await page.goto(`${route('backup',locale)}&save=conflict&recoveryproblem=${problem}`);
      const message=problem==='partial'?uiCopy[locale].recoveryPartial:uiCopy[locale].recoveryUnavailable;
      await expect(page.getByRole('status').filter({hasText:message})).toHaveCount(1);
      await expect(page.getByRole('button',{name:uiCopy[locale].emergencyExport,exact:true})).toHaveCount(1);
    }
    await page.goto(`${route('backup',locale)}&save=conflict&recoverybusy=1&busy=1`);
    await expect(page.getByRole('button',{name:uiCopy[locale].emergencyExport,exact:true})).toBeDisabled();
    await expect(page.getByRole('button',{name:uiCopy[locale].close,exact:true})).toBeEnabled();
    await expect(page.getByRole('button',{name:uiCopy[locale].back,exact:true})).toBeEnabled();
    await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:uiCopy[locale].tools,exact:true})).toBeVisible();
  }
});

test('export completion restores its trigger and preserves deliberate Close focus',async({page})=>{
  for(const recovery of [false,true]){
    const url=`${route('backup')}&save=conflict&exportdelay=1`,name=recovery?uiCopy.en.emergencyExport:uiCopy.en.export;
    await page.goto(url);let trigger=page.getByRole('button',{name,exact:true});await trigger.focus();await trigger.press('Enter');await expect(trigger).toBeDisabled();await expect(trigger).toBeEnabled();await expect(trigger).toBeFocused();
    await page.goto(url);trigger=page.getByRole('button',{name,exact:true});await trigger.focus();await trigger.press('Enter');await expect(trigger).toBeDisabled();const close=page.getByRole('button',{name:uiCopy.en.close,exact:true});await close.focus();await expect(trigger).toBeEnabled();await expect(close).toBeFocused();
    await page.goto(url);trigger=page.getByRole('button',{name,exact:true});await trigger.focus();await trigger.press('Enter');await expect(trigger).toBeDisabled();await page.getByRole('button',{name:uiCopy.en.back,exact:true}).click();await expect(page.getByRole('heading',{name:uiCopy.en.settings,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:uiCopy.en.backup,exact:true})).toBeEnabled();
  }
});

test('retained Quick result names the explicit next difficulty in every locale',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  for(const locale of ['en','de','es'] as const){await page.goto(`${route('result',locale)}&continueband=hard`);await expect(page.getByRole('button',{name:`${uiCopy[locale].continue} · ${uiCopy[locale].hard}`,exact:true})).toBeEnabled();await expect(page.getByRole('dialog').locator('.reward-total')).toContainText('105');}
});

for(const action of ['erase','undo'] as const)test(`editor ${action} keeps useful focus when its trigger becomes unavailable`,async({page})=>{
  await page.goto(route('notes'));await expect(page.locator('.note-specimen span')).toHaveCount(9);
  if(action==='undo')await page.getByRole('button',{name:uiCopy.en.erase,exact:true}).click();
  const trigger=page.getByRole('button',{name:uiCopy.en[action],exact:true});await trigger.focus();await trigger.press('Enter');await expect(trigger).toBeDisabled();await expect(page.locator('#game-dialog-title')).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:uiCopy.en.back,exact:true})).toBeFocused();
});

test('delayed editor command preserves chosen Close focus and a replacement context',async({page})=>{
  for(const target of ['close','back'] as const){await page.goto(`${route('notes')}&commanddelay=1`);const erase=page.getByRole('button',{name:uiCopy.en.erase,exact:true});await erase.focus();await erase.press('Enter');await expect(erase).toBeDisabled();const chosen=page.getByRole('button',{name:uiCopy.en[target],exact:true});await chosen.focus();await expect.poll(()=>page.evaluate(()=>(window as any).uiEvents.includes('command-settled'))).toBe(true);await expect(chosen).toBeFocused();}
  await page.goto(`${route('notes')}&commanddelay=1&commandreplace=1`);const erase=page.getByRole('button',{name:uiCopy.en.erase,exact:true});await erase.focus();await erase.press('Enter');await expect.poll(()=>page.evaluate(()=>(window as any).uiEvents.includes('command-settled'))).toBe(true);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#underlying')).toBeFocused();
});
