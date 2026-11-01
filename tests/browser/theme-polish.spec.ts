import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { Attempt, Preferences, Profile } from '../../src/lib/gameplay/contracts';
import { dictionaries, type Locale } from '../../src/lib/i18n';
import { themeCopy } from '../../src/lib/theme/copy';
import { uiCopy } from '../../src/lib/gameplay/ui/copy';
import { appCopy } from '../../src/lib/gameplay/app-copy';

const evidence = 'prototypes/theme-polish';
interface Snapshot { preferences: Preferences; profile: Profile; attempt?: Attempt }
async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('toadodu:%2F');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Snapshot>((resolve, reject) => {
        const tx = db.transaction(['meta', 'settings', 'profile', 'attempts'], 'readonly');
        const rows: Record<string, any> = {};
        const meta = tx.objectStore('meta').get('current'); meta.onsuccess = () => rows.meta = meta.result;
        for (const name of ['settings', 'profile', 'attempts']) {
          const request = tx.objectStore(name).getAll(); request.onsuccess = () => rows[name] = request.result;
        }
        tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => {
          const active = (name: string) => rows[name].filter((row: any) => row.generation === rows.meta.generation);
          resolve({ preferences: active('settings')[0], profile: active('profile')[0], attempt: active('attempts').find((row: Attempt) => row.role === 'quick') });
        };
      });
    } finally { db.close(); }
  });
}
function logical(value: Attempt) {
  return { id: value.id, generation: value.generation, role: value.role, definition: value.definition,
    policy: value.policy, binding: value.binding, logicalRevision: value.logicalRevision,
    entries: value.entries, notes: value.notes, selection: value.selection, notesMode: value.notesMode,
    undo: value.undo, assistance: value.assistance, status: value.status, scored: value.scored };
}
async function ready(page: Page) {
  await expect(page.locator('.world')).toHaveAttribute('data-theme', /pond|cauldron/);
  await expect(page.getByRole('button', { name: 'Quick Play', exact: true })).toBeEnabled();
  await expect(page).toHaveTitle('Toadoku');
}
async function settings(page: Page) {
  if (await page.locator('.dock').count()) {
    await page.locator('.dock .more').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Settings', exact: true }).click();
  } else await page.locator('.menu-more').click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('combobox', { name: 'Theme', exact: true })).toBeVisible();
}
async function closeDialogs(page: Page) {
  for (let i = 0; i < 4 && await page.getByRole('dialog').count(); i++) {
    const pane = await page.evaluate(() => history.state?.overlay);
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await expect.poll(() => page.evaluate(() => history.state?.overlay)).not.toBe(pane);
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function choose(page: Page, field: string, value: string) {
  const control = page.getByRole('dialog').getByRole('combobox', { name: field, exact: true });
  await expect(control).toBeEnabled(); await control.selectOption(value); await expect(control).toBeEnabled();
}
async function quick(page: Page) {
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
  await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
}
async function bounds(page: Page) {
  return page.locator('.cell').evaluateAll(cells => cells.map(cell => {
    const { x, y, width, height } = cell.getBoundingClientRect();
    return { id: cell.getAttribute('data-cell'), x, y, width, height };
  }));
}
async function sceneFrame(page: Page, screen: 'menu' | 'game') {
  return page.locator(`svg.scene[data-scene="${screen}"]`).evaluate(scene => ({
    paths: [...scene.querySelectorAll(':scope > path')].map(path => path.getAttribute('d')),
    bubbles: [...scene.querySelectorAll('.simmer-bubble')].map(bubble => ({
      geometry: bubble.outerHTML, transform: getComputedStyle(bubble).transform,
    })),
  }));
}
async function dialogCorners(page: Page) {
  const surface = await page.getByRole('dialog').evaluate(dialog => {
    const style = getComputedStyle(dialog), r = dialog.getBoundingClientRect();
    return { radii: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius],
      x: r.x, y: r.y, right: r.right, bottom: r.bottom };
  });
  expect(new Set(surface.radii).size).toBe(1);
  const viewport = page.viewportSize()!;
  expect(surface.x).toBeGreaterThanOrEqual(0); expect(surface.y).toBeGreaterThanOrEqual(0);
  expect(surface.right).toBeLessThanOrEqual(viewport.width + .1); expect(surface.bottom).toBeLessThanOrEqual(viewport.height + .1);
}

/** Test-only PNG sampling verifies the actual four-sided keyline, not merely CSS intent. */
async function renderedKeyEdges(page: Page, theme: string) {
  await page.locator('.cell[data-clue="true"]').first().click();
  const key = page.locator('.dock .numeric').first();
  for (const state of ['normal', 'hover', 'pressed'] as const) {
    if (state !== 'normal') await key.hover();
    if (state === 'pressed') await page.mouse.down();
    try {
      const expected = await key.evaluate(node => getComputedStyle(node).getPropertyValue('--control-edge').trim());
      const png = await key.screenshot();
      const distances = await page.evaluate(async ({ source, expected }) => {
        const image = new Image(); image.src = source; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        ctx.fillStyle = expected; ctx.fillRect(0, 0, 1, 1);
        const color = ctx.getImageData(0, 0, 1, 1).data;
        const distance = (x: number, y: number) => {
          const offset = (y * canvas.width + x) * 4;
          return Math.hypot(pixels[offset] - color[0], pixels[offset + 1] - color[1], pixels[offset + 2] - color[2]);
        };
        const x = Math.floor(canvas.width / 2), y = Math.floor(canvas.height / 2);
        return [
          Math.min(...[0, 1, 2].map(n => distance(x, n))),
          Math.min(...[0, 1, 2].map(n => distance(canvas.width - 1 - n, y))),
          Math.min(...[0, 1, 2].map(n => distance(x, canvas.height - 1 - n))),
          Math.min(...[0, 1, 2].map(n => distance(n, y))),
        ];
      }, { source: `data:image/png;base64,${png.toString('base64')}`, expected });
      for (const [side, distance] of distances.entries()) expect(distance, `${theme}/${state} side${side} actual pixel`).toBeLessThanOrEqual(12);
    } finally { if (state === 'pressed') await page.mouse.up(); }
  }
}

test.beforeAll(async () => { await mkdir(evidence, { recursive: true }); });

test('fresh defaults follow system preferences and saved choices survive reload', async ({ browser }) => {
  const cases: { browserLocale: string; languages?: string[]; expected: Locale; query?: string }[] = [
    { browserLocale: 'de-DE', expected: 'de' },
    { browserLocale: 'fr-FR', languages: ['fr-FR', 'es-MX'], expected: 'es' },
    { browserLocale: 'fr-FR', languages: ['fr-FR', 'ja-JP'], expected: 'en' },
    { browserLocale: 'de-DE', languages: [], expected: 'de' },
    { browserLocale: 'de-DE', expected: 'es', query: '?lang=es' },
  ];
  for (const [index, entry] of cases.entries()) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5195', locale: entry.browserLocale,
      colorScheme: 'dark', reducedMotion: 'reduce', viewport: { width: 360, height: 800 }, timezoneId: 'America/Los_Angeles' });
    try {
      if (entry.languages) await context.addInitScript(languages => {
        Object.defineProperty(navigator, 'languages', { get: () => languages });
      }, entry.languages);
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date('2026-10-31T12:00:00-07:00'));
      await page.goto(`/${entry.query ?? ''}`);
      await expect(page.getByRole('button', { name: dictionaries[entry.expected].quick, exact: true })).toBeEnabled();
      const defaults = { theme: 'auto', appearance: 'system', language: entry.expected, motion: 'system', boardShape: 'fill' };
      await expect.poll(async () => (await snapshot(page)).preferences).toMatchObject(defaults);
      await expect(page.locator('.world')).toHaveAttribute('lang', entry.expected);
      await expect(page.locator('.world')).toHaveAttribute('data-theme', 'cauldron');
      await expect(page.locator('.world')).toHaveAttribute('data-appearance', 'dark');
      await page.locator('.menu-more').click();
      const dialog = page.getByRole('dialog'), c = uiCopy[entry.expected], t = themeCopy[entry.expected];
      for (const [name, value] of [[t.theme, 'auto'], [t.appearance, 'system'], [c.language, entry.expected], [c.motion, 'system'], [c.boardShape, 'fill']]) {
        await expect(dialog.getByRole('combobox', { name, exact: true })).toHaveValue(value);
      }
      if (entry.expected === 'en') await page.screenshot({ path: `${evidence}/fresh-defaults-auto-system.png` });
      if (index !== 0) continue;
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
      await expect(page.locator('.world')).toHaveAttribute('data-appearance', 'light');
      expect((await snapshot(page)).preferences.appearance).toBe('system');
      await dialog.getByRole('button', { name: c.close, exact: true }).click();
      const still = await sceneFrame(page, 'menu');
      await page.evaluate(async () => { for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame); });
      expect(await sceneFrame(page, 'menu')).toEqual(still);
      await page.locator('.menu-more').click();
      for (const [name, value] of [[t.theme, 'pond'], [t.appearance, 'light'], [c.motion, 'full'], [c.boardShape, 'square']]) {
        const control = dialog.getByRole('combobox', { name, exact: true });
        await expect(control).toBeEnabled(); await control.selectOption(value);
        await expect(control).toBeEnabled();
      }
      await dialog.getByRole('combobox', { name: c.language, exact: true }).selectOption('es');
      await expect(dialog.getByRole('combobox', { name: uiCopy.es.language, exact: true })).toBeEnabled();
      const custom = { theme: 'pond', appearance: 'light', language: 'es', motion: 'full', boardShape: 'square' };
      await expect.poll(async () => (await snapshot(page)).preferences).toMatchObject(custom);
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      await page.reload();
      await expect(page.getByRole('button', { name: dictionaries.es.quick, exact: true })).toBeEnabled();
      await expect(page.locator('.world')).toHaveAttribute('lang', 'es');
      await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
      await expect(page.locator('.world')).toHaveAttribute('data-appearance', 'light');
      expect((await snapshot(page)).preferences).toMatchObject(custom);
    } finally { await context.close(); }
  }
});

test('Auto repeats yearly at actual local midnight across time zones without changing saved choices', async ({ browser }) => {
  for (const timezoneId of ['UTC', 'Europe/Vienna', 'America/Los_Angeles', 'America/Santiago']) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5195', locale: 'en-US', timezoneId,
      viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const localStamp = (year: number, month: number, day: number) =>
        page.evaluate(({ year, month, day }) => new Date(year, month, day, 23, 59, 30).getTime(), { year, month, day });
      const initial = await localStamp(2026, 9, 23);
      await page.clock.install({ time: initial }); await page.clock.pauseAt(initial);
      await page.goto('/'); await ready(page);
      await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
      const before = await snapshot(page);
      expect(before.preferences.theme).toBe('auto');
      await settings(page);
      const auto = page.getByRole('dialog').getByRole('combobox', { name: 'Theme', exact: true }).locator('option[value="auto"]');
      for (const year of [2026, 2027, 2032, 2100]) {
        // Jump years without running a year's worth of timers. The synthetic
        // focus event exercises the existing resume handler and re-arms midnight.
        await page.clock.setSystemTime(await localStamp(year, 9, 23));
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
        await expect(auto).toHaveText('Auto \u00b7 Pond');
        await page.clock.fastForward(30_000);
        await expect(page.locator('.world')).toHaveAttribute('data-theme', 'cauldron');
        await expect(auto).toHaveText('Auto \u00b7 Cauldron');
        await expect(page.locator('#automatic-theme-description')).toContainText('Cauldron ends in');
        await page.clock.setSystemTime(await localStamp(year, 10, 6));
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await expect(page.locator('#automatic-theme-description')).toHaveText('Cauldron ends in less than 1 hour (Halloween).');
        await page.clock.fastForward(30_000);
        await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
        await expect(auto).toHaveText('Auto \u00b7 Pond');
        await expect(page.locator('#automatic-theme-description')).toHaveCount(0);
        const after = await snapshot(page);
        expect(after.preferences).toEqual(before.preferences);
        expect(after.profile).toEqual(before.profile);
        expect(after.attempt).toBeUndefined();
      }
    } finally { await context.close(); }
  }
});

test('Auto names its actual theme and updates remaining time on minutes and local midnight', async ({ page }) => {
  const start = new Date('2026-11-06T22:59:30-08:00');
  await page.clock.install({ time: start }); await page.clock.pauseAt(start);
  await page.goto('/'); await ready(page); await settings(page);
  const auto = page.getByRole('dialog').getByRole('combobox', { name: 'Theme', exact: true }).locator('option[value="auto"]');
  await expect(auto).toHaveText('Auto \u00b7 Cauldron');
  await expect(page.locator('#automatic-theme-description')).toHaveText('Cauldron ends in 2 hours (Halloween).');
  expect(await page.locator('#automatic-theme-description').getAttribute('aria-live')).toBeNull();
  expect(await page.locator('#automatic-theme-description').getAttribute('role')).toBeNull();
  await page.clock.fastForward(30_000);
  await expect(page.locator('#automatic-theme-description')).toHaveText('Cauldron ends in 1 hour (Halloween).');
  await page.clock.fastForward(60_000);
  await expect(page.locator('#automatic-theme-description')).toHaveText('Cauldron ends in less than 1 hour (Halloween).');
  await page.clock.fastForward(59 * 60_000);
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
  await expect(auto).toHaveText('Auto \u00b7 Pond');
  await expect(page.locator('#automatic-theme-description')).toHaveCount(0);
  expect((await snapshot(page)).preferences.theme).toBe('auto');
});

test('pending and failed Auto imports retain applied-theme truth without minute retries', async ({ page }) => {
  const start = new Date('2026-10-23T23:59:30-07:00');
  await page.clock.install({ time: start }); await page.clock.pauseAt(start);
  await page.goto('/'); await ready(page); await settings(page);
  let attempts = 0, release!: () => void;
  const gate = new Promise<void>(resolve => release = resolve);
  await page.route(/\/src\/lib\/theme\/cauldron\.ts(?:\?|$)/, async route => { attempts++; await gate; await route.abort(); });
  try {
    await page.clock.fastForward(30_000);
    await expect.poll(() => attempts).toBe(1);
    await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
    const dialog = page.getByRole('dialog'), auto = dialog.getByRole('combobox', { name: 'Theme', exact: true }).locator('option[value="auto"]');
    await expect(auto).toHaveText('Auto \u00b7 Pond');
    await expect(page.locator('#automatic-theme-description')).toContainText('Switching to Cauldron...');
    release();
    await expect(dialog.getByText('Theme could not load.', { exact: true })).toBeVisible();
    await page.clock.fastForward(60_000);
    expect(attempts).toBe(1);
    await expect(auto).toHaveText('Auto \u00b7 Pond');
    await expect(dialog.getByText('Theme could not load.', { exact: true })).toBeVisible();
    expect((await snapshot(page)).preferences.theme).toBe('auto');
  } finally { release(); }
});

test('dedicated menu and game simmer moves while hits, edits and rewards stay fixed; reduced stays static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.setFixedTime(new Date('2026-10-31T12:00:00-07:00'));
  await page.goto('/'); await ready(page);
  await expect(page.locator('.simmer-bubble').first()).toBeAttached();
  const menu = await sceneFrame(page, 'menu');
  await expect.poll(async () => JSON.stringify((await sceneFrame(page, 'menu')).bubbles)).not.toBe(JSON.stringify(menu.bubbles));
  await page.screenshot({ path: `${evidence}/cauldron-live-menu-360x800.png` });
  await quick(page);
  let save = await snapshot(page), current = save.attempt!;
  const blanks = [...current.definition.givens].map((digit, id) => digit === '0' ? id : -1).filter(id => id >= 0);
  const peers = (a: number, b: number) => Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9
    || Math.floor(a / 27) === Math.floor(b / 27) && Math.floor(a % 9 / 3) === Math.floor(b % 9 / 3);
  const entered = blanks.find(cell => [...current.definition.givens].some((digit, id) => digit !== '0' && peers(cell, id)))!;
  const clue = [...current.definition.givens].findIndex((digit, id) => digit !== '0' && peers(entered, id));
  await page.locator(`[data-cell="${entered}"]`).click(); await page.keyboard.press(current.definition.givens[clue]);
  await expect(page.locator(`[data-cell="${entered}"]`)).toHaveAttribute('data-conflict', 'true');
  await page.locator('.dock .more').click(); await page.getByRole('dialog').getByRole('button', { name: 'Notes', exact: true }).click();
  const noteCell = blanks.find(cell => cell !== entered)!;
  await page.locator(`[data-cell="${noteCell}"]`).click(); await page.keyboard.press('2'); await page.keyboard.press('7');
  await expect.poll(async () => (await snapshot(page)).attempt!.notes[noteCell]).toBe((1 << 1) | (1 << 6));
  await page.keyboard.press('ArrowRight'); await expect(page.locator('.focus-dew')).toHaveCount(2);
  save = await snapshot(page); current = save.attempt!;
  const rectangles = await bounds(page), game = await sceneFrame(page, 'game');
  await expect.poll(async () => JSON.stringify((await sceneFrame(page, 'game')).bubbles)).not.toBe(JSON.stringify(game.bubbles));
  await expect.poll(async () => JSON.stringify((await sceneFrame(page, 'game')).paths)).not.toBe(JSON.stringify(game.paths));
  expect(await bounds(page)).toEqual(rectangles);
  const changed = await snapshot(page);
  expect(logical(changed.attempt!)).toEqual(logical(current)); expect(changed.profile).toEqual(save.profile);
  expect(changed.attempt!.commandSeq).toBeGreaterThanOrEqual(current.commandSeq);
  expect(changed.attempt!.elapsedMs).toBeGreaterThanOrEqual(current.elapsedMs);
  await expect(page.locator(`[data-cell="${noteCell}"] .note`)).toHaveCount(2);
  await expect(page.locator(`[data-cell="${entered}"] .conflict-mark`)).toHaveText('!');
  await settings(page); await choose(page, 'Motion', 'reduced'); await closeDialogs(page);
  const still = await sceneFrame(page, 'game');
  await page.evaluate(async () => { for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame); });
  expect(await sceneFrame(page, 'game')).toEqual(still);
});

test('responsive flat themes retain curves, all key edges and overlays in Fill and Square', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-31T12:00:00-07:00'));
  await page.goto('/'); await ready(page); await quick(page);
  for (const [width, height] of [[360, 800], [800, 360], [1280, 720], [880, 885], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    for (const shape of width === 880 ? ['fill', 'square'] : ['fill']) {
      let original: Awaited<ReturnType<typeof bounds>> | undefined;
      for (const theme of ['pond', 'cauldron']) {
        await settings(page); await choose(page, 'Board shape', shape); await choose(page, 'Theme', theme);
        await choose(page, 'Appearance', 'light'); await expect(page.locator('.world')).toHaveAttribute('data-theme', theme);
        await closeDialogs(page); await expect(page.locator('.cell')).toHaveCount(81);
        await expect(page.locator('.dock button')).toHaveCount(10);
        const rectangles = await bounds(page);
        if (original) expect(rectangles).toEqual(original); else original = rectangles;
        if (shape === 'square') {
          const box = await page.locator('.board').boundingBox(); expect(box!.width).toBeCloseTo(box!.height);
        }
        await page.screenshot({ path: `${evidence}/${theme}-${width}x${height}-${shape}-board.png` });
        if (width === 360) {
          await settings(page); await choose(page, 'Appearance', 'dark');
          await expect(page.locator('.world')).toHaveAttribute('data-appearance', 'dark');
          await dialogCorners(page);
          await page.screenshot({ path: `${evidence}/${theme}-360x800-dark-settings.png` });
          await closeDialogs(page); await renderedKeyEdges(page, theme);
        }
      }
    }
  }
});

test('ordinary overlays retain the puzzle and key styles, while explicit Pause blurs and stops time', async ({ page }) => {
  const start = new Date('2026-10-31T12:00:00-07:00');
  await page.clock.install({ time: start }); await page.clock.pauseAt(start);
  await page.goto('/'); await ready(page); await quick(page);
  await page.locator('.cell[data-clue="false"]').first().click();
  await page.keyboard.press('1');
  await expect.poll(async () => (await snapshot(page)).attempt!.entries.some(value => value === 1)).toBe(true);
  const initial = (await snapshot(page)).attempt!, cells = await bounds(page);
  const firstCell = await page.locator('.cell').first().elementHandle();
  await page.mouse.move(0, 0);
  const keyStyles = () => page.locator('.dock > button').evaluateAll(buttons => buttons.map(button => {
    const r = button.getBoundingClientRect(), s = getComputedStyle(button);
    return { text: button.textContent, disabled: (button as HTMLButtonElement).disabled,
      x: r.x, y: r.y, width: r.width, height: r.height, face: s.backgroundColor, edge: s.boxShadow };
  }));
  const keys = await keyStyles();
  await page.locator('.dock').evaluate(dock => {
    const observation = { disabled: false };
    (window as any).dockObservation = observation;
    new MutationObserver(() => {
      if ([...dock.querySelectorAll('button')].some(button => button.disabled)) observation.disabled = true;
    }).observe(dock, { attributes: true, subtree: true, attributeFilter: ['disabled'] });
  });
  const unchanged = async () => {
    await page.mouse.move(0, 0);
    expect(await bounds(page)).toEqual(cells);
    expect(await keyStyles()).toEqual(keys);
    expect(await firstCell!.evaluate(cell => cell.isConnected && cell === document.querySelector('.cell'))).toBe(true);
    expect(logical((await snapshot(page)).attempt!)).toEqual(logical(initial));
  };
  const stillTimed = async () => {
    const before = (await snapshot(page)).attempt!.elapsedMs;
    await page.clock.runFor(2100);
    // Durable time checkpoints are sampled at most once a second; the last
    // acknowledged sample can precede the end of this 2.1-second interval.
    await expect.poll(async () => (await snapshot(page)).attempt!.elapsedMs).toBeGreaterThanOrEqual(before + 1000);
  };
  await page.locator('.dock .more').click(); await expect(page.getByRole('dialog').getByText('Tools', { exact: true })).toBeVisible();
  await unchanged(); await stillTimed();
  await page.keyboard.press('2'); await unchanged(); // Native modal + app input guard.
  await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog').evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
  await page.getByRole('dialog').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await unchanged(); await stillTimed();
  for (const action of ['Backup', 'Restart puzzle', 'New puzzle']) {
    await page.getByRole('dialog').getByRole('button', { name: action, exact: true }).click();
    await unchanged(); await stillTimed();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  }
  await page.screenshot({ path: `${evidence}/persistent-board-settings-360x800.png` });
  await page.getByRole('dialog').getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'blur(12px)');
  await unchanged();
  const paused = (await snapshot(page)).attempt!.elapsedMs;
  await page.clock.runFor(3100);
  expect((await snapshot(page)).attempt!.elapsedMs).toBe(paused);
  await page.screenshot({ path: `${evidence}/persistent-board-paused-360x800.png` });
  await page.getByRole('dialog').getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'none');
  await unchanged(); await stillTimed();
  await expect(page.locator('.dock .more')).toBeFocused();
  expect(await page.evaluate(() => (window as any).dockObservation.disabled)).toBe(false);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'blur(12px)');
  const hidden = (await snapshot(page)).attempt!.elapsedMs;
  await page.clock.runFor(2100);
  expect((await snapshot(page)).attempt!.elapsedMs).toBe(hidden);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'none');
  await unchanged(); await stillTimed();
  const second = await page.context().newPage();
  try {
    await second.goto('/'); await ready(second);
    await second.getByRole('button', { name: 'Quick Play', exact: true }).click();
    await second.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(second.locator('.cell')).toHaveCount(81);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await expect(page.locator('.cell')).toHaveCount(0); // Stale writers never retain readable values.
  } finally { await second.close(); }
  await firstCell!.dispose();
});

test('lazy dialog loading and failure preserve Quick Play and its button styles', async ({ page }) => {
  let release!: () => void, seen = 0;
  const held = new Promise<void>(resolve => release = resolve);
  await page.route('**/src/lib/gameplay/ui/GameDialog.svelte*', async route => {
    seen++; await held; await route.abort('failed');
  });
  try {
    await page.goto('/'); await ready(page);
    await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
    const menu = await page.locator('.menu-panel').evaluate(panel => panel.outerHTML);
    await page.locator('.menu-more').click();
    await expect.poll(() => seen).toBe(1);
    await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Loading…');
    expect(await page.locator('.menu-panel').evaluate(panel => panel.outerHTML)).toBe(menu);
    await page.keyboard.press('1'); expect(await page.locator('.cell').count()).toBe(0);
    release();
    await expect(page.getByRole('dialog').getByRole('status')).toHaveText(appCopy.en.featureLoadError);
    expect(await page.locator('.menu-panel').evaluate(panel => panel.outerHTML)).toBe(menu);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.menu-more')).toBeFocused();
    expect(await page.locator('.menu-panel').evaluate(panel => panel.outerHTML)).toBe(menu);
  } finally { release(); }
});

test('submenu headings use the ground foreground in both themes and appearances', async ({ page }) => {
  await page.goto('/'); await ready(page);
  for (const theme of ['pond', 'cauldron']) for (const appearance of ['light', 'dark']) {
    await settings(page); await choose(page, 'Theme', theme); await choose(page, 'Appearance', appearance);
    await expect(page.locator('.world')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.world')).toHaveAttribute('data-appearance', appearance);
    await closeDialogs(page);
    await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
    const ink = theme === 'pond' ? 'rgb(23, 63, 53)' : 'rgb(255, 240, 202)';
    await expect(page.locator('.menu-panel h2')).toHaveCSS('color', ink);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Progression', exact: true }).click();
    await expect(page.locator('.menu-panel h2')).toHaveCSS('color', ink);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
  }
});

test('HUD rows keep localized labels and identity anchors while condensing only roomy bottom docks', async ({ page, browser }) => {
  await page.clock.setFixedTime(new Date('2026-10-31T12:00:00-07:00'));
  await page.goto('/'); await ready(page);
  const identity = () => page.locator('h1, .art-slot').evaluateAll(nodes => nodes.map(node => {
    const { x, y, width, height } = node.getBoundingClientRect(); return { x, y, width, height };
  }));
  const openSettings = async () => {
    if (await page.locator('.dock').count()) {
      await page.locator('.dock .more').click();
      await page.getByRole('dialog').getByRole('button', { name: /^(Settings|Einstellungen|Ajustes)$/ }).click();
    } else await page.locator('.menu-more').click();
    await expect(page.getByRole('dialog').getByRole('combobox', { name: /^(Language|Sprache|Idioma)$/ })).toBeVisible();
  };
  const close = async () => {
    for (let i = 0; i < 4 && await page.getByRole('dialog').count(); i++) {
      const pane = await page.evaluate(() => history.state?.overlay);
      await page.getByRole('dialog').getByRole('button', { name: /^(Close|Schlie.+en|Cerrar)$/ }).click();
      await expect.poll(() => page.evaluate(() => history.state?.overlay)).not.toBe(pane);
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
  };
  for (const [width, height] of [[320, 568], [360, 800], [800, 360], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    for (const locale of ['en', 'de', 'es'] as const) {
      await openSettings();
      await page.getByRole('dialog').getByRole('combobox', { name: /^(Language|Sprache|Idioma)$/ }).selectOption(locale);
      await expect(page.getByRole('dialog').getByRole('heading', { name: uiCopy[locale].settings, exact: true })).toBeVisible();
      await close();
      const geometry = await page.locator('.menu-panel.base-row > button, .menu-more').evaluateAll(buttons => buttons.map(button => {
        const r = button.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(button);
        const text = range.getBoundingClientRect();
        return { y: r.y, height: r.height, left: text.left - r.left, right: r.right - text.right, top: text.top - r.top, bottom: r.bottom - text.bottom };
      }));
      expect(geometry).toHaveLength(3);
      for (const button of geometry) {
        expect(button.height).toBeCloseTo(Math.min(64, (Math.min(width, height) - 32) / 5), 1);
        expect(button.y).toBeCloseTo(geometry[0].y, 1); // Native layout rounds fractional CSS pixels.
        for (const distance of [button.left, button.right, button.top, button.bottom]) expect(distance).toBeGreaterThanOrEqual(-.5);
      }
      const before = await identity();
      await page.getByRole('button', { name: dictionaries[locale].quick, exact: true }).click();
      await expect(page.getByRole('heading', { name: dictionaries[locale].quick, exact: true })).toBeVisible();
      expect(await identity()).toEqual(before);
      await assertMenuOverlay();
      await page.getByRole('button', { name: dictionaries[locale].back, exact: true }).click();
      await page.getByRole('button', { name: dictionaries[locale].progression, exact: true }).click();
      await expect(page.getByRole('heading', { name: dictionaries[locale].progression, exact: true })).toBeVisible();
      expect(await identity()).toEqual(before);
      await assertMenuOverlay();
      await page.getByRole('button', { name: dictionaries[locale].back, exact: true }).click();
      if (width === 320 && locale === 'de') await page.screenshot({ path: `${evidence}/menu-row-320x568-de.png` });
      if (locale === 'en') await page.screenshot({ path: `${evidence}/cauldron-menu-${width}x${height}.png` });
    }
  }
  async function assertMenuOverlay() {
    const controls = page.locator('.menu-panel button, .menu-more');
    const heights = await controls.evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height));
    for (const height of heights) expect(height).toBeCloseTo(heights[0], 1);
    const menu = await page.locator('.menu-panel').evaluate(panel => panel.outerHTML);
    const identityBefore = await identity();
    const firstButton = await controls.first().elementHandle();
    await openSettings();
    expect(await page.locator('.menu-panel').evaluate(panel => panel.outerHTML)).toBe(menu);
    expect(await identity()).toEqual(identityBefore);
    expect(await firstButton!.evaluate(button => button.isConnected && button === document.querySelector('.menu-panel button'))).toBe(true);
    await page.getByRole('dialog').getByRole('button', { name: /^(Backup|Sicherung|Copia de seguridad)$/ }).click();
    expect(await page.locator('.menu-panel').evaluate(panel => panel.outerHTML)).toBe(menu);
    await close();
    await expect(page.locator('.menu-more')).toBeFocused();
    expect(await page.locator('.menu-panel').evaluate(panel => panel.outerHTML)).toBe(menu);
    await firstButton!.dispose();
  }
  await page.getByRole('button', { name: dictionaries.es.quick, exact: true }).click();
  await page.getByRole('button', { name: dictionaries.es.easy, exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  const before = (await snapshot(page)).attempt!;
  for (const [width, height, rows] of [[360, 800, 2], [800, 360, 5], [532, 800, 2], [612, 800, 1], [880, 885, 1]]) {
    await page.setViewportSize({ width, height });
    // Browser resize precedes ResizeObserver/Svelte allocation publication.
    // Check dimensions too because consecutive roomy sizes both have one row.
    await expect.poll(() => page.locator('.dock').evaluate(dock => {
      const r = dock.getBoundingClientRect();
      return { rows: new Set([...dock.children].map(button => button.getBoundingClientRect().y.toFixed(2))).size,
        right: Math.round(r.right), bottom: Math.round(r.bottom) };
    })).toEqual({ rows, right: width - 8, bottom: height - 8 });
    const rectangles = await page.locator('.dock > button').evaluateAll(buttons => buttons.map(button => {
      const { x, y, width, height } = button.getBoundingClientRect(); return { x, y, width, height };
    }));
    expect(rectangles).toHaveLength(10);
    expect(new Set(rectangles.map(r => r.y.toFixed(2))).size).toBe(rows);
    for (const r of rectangles) expect(r.height).toBeCloseTo(rectangles[0].height, 1);
    if (rows === 1) for (const [i, r] of rectangles.entries()) {
      expect(r.width).toBeGreaterThanOrEqual(56 - .01); expect(r.height).toBe(56);
      if (i) expect(r.x - rectangles[i - 1].x - rectangles[i - 1].width).toBeCloseTo(4);
    }
  }
  expect(logical((await snapshot(page)).attempt!)).toEqual(logical(before));
  await page.setViewportSize({ width: 612, height: 800 });
  for (const locale of ['en', 'de', 'es'] as const) {
    await openSettings();
    await page.getByRole('dialog').getByRole('combobox', { name: /^(Language|Sprache|Idioma)$/ }).selectOption(locale);
    await expect(page.getByRole('dialog').getByRole('heading', { name: uiCopy[locale].settings, exact: true })).toBeVisible();
    await close();
    if (!await page.locator('.dock .notes-mode').count()) {
      await page.locator('.dock .more').click();
      await page.getByRole('dialog').getByRole('button', { name: uiCopy[locale].notes, exact: true }).click();
    }
    await expect(page.locator('.dock .notes-mode')).toHaveCount(1);
    const inside = await page.locator('.dock .notes-mode').evaluate(label => {
      const b = label.closest('button')!.getBoundingClientRect(), range = document.createRange();
      range.selectNodeContents(label);
      return [range.getBoundingClientRect(), ...[...label.querySelectorAll('svg')].map(icon => icon.getBoundingClientRect())]
        .every(l => l.left >= b.left && l.right <= b.right && l.top >= b.top && l.bottom <= b.bottom);
    });
    expect(inside).toBe(true);
  }
  await page.screenshot({ path: `${evidence}/bottom-row-612x800-notes-es.png` });
  // A separate disposable context exercises the real recovery-play badge with
  // its longest localized copy, rather than injecting UI markup or saved state.
  for (const locale of ['en', 'de', 'es'] as const) {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:5195', viewport: { width: 612, height: 800 },
      reducedMotion: 'reduce', timezoneId: 'America/Los_Angeles',
    });
    try {
      await context.addInitScript(() => Object.defineProperty(indexedDB, 'open', {
        value: () => { throw new DOMException('Test-only storage failure', 'SecurityError'); },
      }));
      const recovery = await context.newPage();
      await recovery.goto(`/?lang=${locale}`);
      await recovery.getByRole('button', { name: appCopy[locale].unscored, exact: true }).click();
      await recovery.getByRole('button', { name: dictionaries[locale].easy, exact: true }).click();
      await expect(recovery.locator('.cell')).toHaveCount(81);
      await recovery.locator('.dock .more').click();
      await recovery.getByRole('dialog').getByRole('button', { name: uiCopy[locale].notes, exact: true }).click();
      await expect(recovery.locator('.dock .save-label')).toHaveText(appCopy[locale].unscoredShort);
      const badge = await recovery.locator('.dock .more').evaluate(button => {
        const b = button.getBoundingClientRect(), label = button.querySelector('.save-label')!;
        // Selecting the outer label also includes its child's element box.
        // Count only actual text fragments, not that additional container box.
        const range = document.createRange(); range.selectNodeContents(label.querySelector('span')!);
        const icons = [...button.querySelectorAll('svg')].map(icon => icon.getBoundingClientRect());
        const visual = [label.getBoundingClientRect(), range.getBoundingClientRect(), ...icons];
        return { height: b.height, fits: visual.every(r => r.left >= b.left && r.right <= b.right && r.top >= b.top && r.bottom <= b.bottom),
          icons: icons.map(icon => [icon.width, icon.height]), font: parseFloat(getComputedStyle(label).fontSize),
          lines: new Set([...range.getClientRects()].map(r => r.top.toFixed(2))).size };
      });
      expect(badge.height).toBe(56); expect(badge.fits).toBe(true);
      expect(badge.icons).toEqual([[20, 20], [12, 12]]);
      expect(badge.font).toBeGreaterThanOrEqual(11); expect(badge.lines).toBeLessThanOrEqual(2);
      if (locale === 'de') await recovery.screenshot({ path: `${evidence}/bottom-row-612x800-unscored-notes-de.png` });
    } finally { await context.close(); }
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('.dock .more').click();
  await page.getByRole('dialog').getByRole('button', { name: uiCopy.es.mainMenu, exact: true }).click();
  await page.getByRole('button', { name: dictionaries.es.quick, exact: true }).click();
  await expect(page.locator('.menu-panel').getByRole('button', { name: appCopy.es.resume, exact: true })).toBeVisible();
  await assertMenuOverlay(); // The retained attempt adds a third action row.
  await page.screenshot({ path: `${evidence}/persistent-quick-resume-320x568-es.png` });
});
