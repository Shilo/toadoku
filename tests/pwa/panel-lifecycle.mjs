import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from './server.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const root = resolve(process.argv[2] ?? 'dist');
const evidence = resolve('prototypes/pwa-validation/panel-lifecycle-' + Date.now());
await mkdir(evidence, { recursive: true });
const host = await staticHost({ root, port: 5197 });
const result = { root, events: [], requests: host.state.requests };
let context, release = () => {};
const mark = (name, data = {}) => result.events.push({ name, ...data });
try {
  context = await chromium.launchPersistentContext(resolve(evidence, 'profile'), {
    headless: true, viewport: { width: 360, height: 800 }, deviceScaleFactor: 3,
  });
  const page = context.pages()[0];
  page.setDefaultTimeout(10000);
  await page.goto(host.origin + '/toadoku/', { waitUntil: 'domcontentloaded' });
  result.build = await page.locator('meta[name="toadoku-build"]').getAttribute('content');
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
  await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  const blank = page.locator('[data-clue="false"]').first();
  await blank.press('1');
  async function saved() {
    return page.evaluate(async () => {
      const db = await new Promise((done, fail) => {
        const request = indexedDB.open('toadodu:' + encodeURIComponent('/toadoku/'));
        request.onsuccess = () => done(request.result); request.onerror = () => fail(request.error);
      });
      try {
        return await new Promise((done, fail) => {
          const names = ['attempts', 'pools', 'issued', 'issuedBuckets', 'receipts', 'receiptBuckets', 'profile', 'roles'];
          const transaction = db.transaction(names, 'readonly'), data = {};
          for (const name of names) {
            const request = transaction.objectStore(name).getAll();
            request.onsuccess = () => data[name] = request.result;
          }
          transaction.oncomplete = () => done(data); transaction.onabort = () => fail(transaction.error);
        });
      } finally { db.close(); }
    });
  }
  const cellIndex = Number(await blank.getAttribute('data-cell'));
  await expect.poll(async () => (await saved()).attempts.find(a => a.role === 'quick')?.entries[cellIndex]).toBe(1);
  const before = await saved();
  async function closePanels() {
    for (let depth = 0; depth < 8 && await page.getByRole('dialog').count(); depth++) {
      const title = await page.locator('#game-dialog-title').textContent();
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
      await page.waitForFunction(previous => {
        const node = document.querySelector('#game-dialog-title');
        return !node || node.textContent !== previous;
      }, title);
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  async function openPanel() {
    await page.locator('.dock .more').click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Install and offline', exact: true }).click();
  }
  async function revealOptions() {
    const details = page.locator('details').filter({ has: page.getByText('More offline options', { exact: true }) });
    if (await details.getAttribute('open') === null) await details.locator('summary').click();
  }
  const prepare = page.getByRole('button', { name: 'Prepare offline play', exact: true });
  const travel = page.getByRole('button', { name: 'Prepare a longer trip', exact: true });
  const cancel = page.getByRole('button', { name: 'Cancel preparation', exact: true });
  function holdNextFile(status) {
    let held;
    const gate = new Promise(done => release = done);
    host.state.fault = path => {
      if (!held && /\/catalog\/v1\/(?:easy|medium-(?:low|high)|hard-(?:low|high))-\d+-[a-f0-9]+\.json$/.test(path)) {
        held = path;
        return { wait: gate, ...(status ? { status } : {}) };
      }
    };
    return () => held;
  }
  await openPanel();
  await expect(prepare).toBeEnabled({ timeout: 30000 });
  const firstHeld = holdNextFile();
  await prepare.click();
  await expect.poll(firstHeld, { timeout: 30000 }).toBeTruthy();
  await closePanels();
  await openPanel();
  await expect(cancel).toBeVisible();
  await revealOptions();
  await expect(travel).toBeDisabled();
  release(); host.state.fault = undefined;
  await expect(cancel).toHaveCount(0, { timeout: 30000 });
  await expect(prepare).toBeEnabled({ timeout: 10000 });
  await expect(travel).toBeEnabled({ timeout: 3000 });
  mark('completion-refreshes-reopened-panel', { held: firstHeld(), panel: await page.locator('.pwa-pane').innerText() });

  const failedHeld = holdNextFile(503);
  await travel.click();
  await expect.poll(failedHeld, { timeout: 30000 }).toBeTruthy();
  await closePanels();
  await openPanel();
  await expect(cancel).toBeVisible();
  release(); host.state.fault = undefined;
  await expect(cancel).toHaveCount(0, { timeout: 10000 });
  await revealOptions();
  await expect(travel).toBeEnabled({ timeout: 10000 });
  await expect(page.locator('.pwa-pane')).toContainText('could not finish');
  mark('failure-refreshes-reopened-panel', { held: failedHeld(), panel: await page.locator('.pwa-pane').innerText() });

  const secondHeld = holdNextFile();
  await travel.click();
  await expect.poll(secondHeld, { timeout: 30000 }).toBeTruthy();
  await closePanels();
  await openPanel();
  await expect(cancel).toBeVisible();
  await cancel.click();
  const atCancel = host.state.requests.length;
  release(); host.state.fault = undefined;
  await revealOptions();
  await expect(travel).toBeEnabled({ timeout: 10000 });
  await expect.poll(() => host.state.requests.filter(r => r.path.includes('/catalog/v1/')).every(r => r.end !== undefined || r.closed)).toBe(true);
  assert.equal(host.state.requests.slice(atCancel).filter(r => /\/catalog\/v1\/.+\.json$/.test(r.path) && !r.path.endsWith('manifest.json')).length, 0);
  mark('cancel-refreshes-reopened-panel', { held: secondHeld(), panel: await page.locator('.pwa-pane').innerText() });
  await closePanels();
  await expect(blank).toContainText('1');
  const after = await saved();
  assert.equal(after.attempts.length, before.attempts.length);
  const checkpoints = [];
  for (const old of before.attempts) {
    const current = after.attempts.find(a => a.id === old.id); assert(current);
    for (const field of ['revision', 'commandSeq', 'elapsedMs']) {
      assert(Number.isFinite(current[field]) && current[field] >= old[field]);
    }
    const stable = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['revision', 'commandSeq', 'elapsedMs'].includes(key)));
    assert.deepEqual(stable(current), stable(old));
    checkpoints.push({ id: old.id, before: { revision: old.revision, commandSeq: old.commandSeq, elapsedMs: old.elapsedMs }, after: { revision: current.revision, commandSeq: current.commandSeq, elapsedMs: current.elapsedMs } });
  }
  for (const name of Object.keys(before).filter(name => name !== 'attempts')) assert.deepEqual(after[name], before[name]);
  mark('entered-digit-and-essential-state-preserved', { checkpoints });
  result.passed = true;
} catch (error) {
  result.error = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  release();
  await context?.close();
  await host.close();
  await writeFile(resolve(evidence, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ evidence, passed: result.passed ?? false, error: result.error }));
}
