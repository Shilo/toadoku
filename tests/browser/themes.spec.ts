import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { Attempt, Preferences, Profile } from '../../src/lib/gameplay/contracts';
import { themeCopy } from '../../src/lib/theme/copy';
import { uiCopy } from '../../src/lib/gameplay/ui/copy';

const evidence = 'prototypes/theme-evidence';
interface Snapshot { preferences: Preferences; profile: Profile; attempts: Attempt[] }
async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(async () => {
    const name = (await indexedDB.databases()).find(db => db.name?.startsWith('toadodu:'))?.name;
    if (!name) throw Error('No theme test database');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      request.onblocked = () => reject(Error('Readonly theme snapshot blocked'));
    });
    try {
      return await new Promise<Snapshot>((resolve, reject) => {
        const tx = db.transaction(['meta', 'settings', 'profile', 'attempts'], 'readonly');
        const values: Record<string, any> = {};
        const meta = tx.objectStore('meta').get('current'); meta.onsuccess = () => values.meta = meta.result;
        for (const name of ['settings', 'profile', 'attempts']) {
          const request = tx.objectStore(name).getAll(); request.onsuccess = () => values[name] = request.result;
        }
        tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
        tx.oncomplete = () => {
          const active = (name: string) => values[name].filter((row: any) => row.generation === values.meta.generation);
          resolve({ preferences: active('settings')[0], profile: active('profile')[0], attempts: active('attempts') });
        };
      });
    } finally { db.close(); }
  });
}
const attempt = (save: Snapshot) => {
  const result = save.attempts.find(value => value.role === 'quick');
  if (!result) throw Error('No Quick attempt'); return result;
};
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
  await expect(page.getByRole('heading', { name: 'Toadoku', exact: true })).toBeVisible();
}
async function settings(page: Page) {
  if (await page.locator('.dock').count()) {
    await page.locator('.dock .more').click();
    await page.getByRole('dialog').getByRole('button', { name: /^(Settings|Einstellungen|Ajustes)$/ }).click();
  } else await page.locator('.menu-more').click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: /^(Settings|Einstellungen|Ajustes)$/ })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('combobox', { name: /^(Theme|Thema|Tema)$/ })).toBeVisible();
}
async function closeDialogs(page: Page) {
  for (let i = 0; i < 4 && await page.getByRole('dialog').count(); i++) {
    await page.getByRole('dialog').getByRole('button', { name: /^(Close|Schlie.+en|Cerrar)$/ }).click();
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
async function roundCorners(page: Page) {
  const corners = await page.getByRole('dialog').evaluate(dialog => {
    const style = getComputedStyle(dialog); return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius];
  });
  expect(new Set(corners).size).toBe(1);
  const box = await page.getByRole('dialog').boundingBox(), viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + .1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + .1);
}

test.beforeAll(async () => { await mkdir(evidence, { recursive: true }); });

test('UI preferences persist and preserve puzzle edits, notes, undo, geometry and rewards', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-31T12:00:00-07:00'));
  await page.goto('/'); await ready(page);
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'cauldron');
  expect((await snapshot(page)).preferences.theme).toBe('auto');
  await settings(page); await choose(page, 'Theme', 'pond');
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
  await closeDialogs(page); await quick(page);
  let save = await snapshot(page), current = attempt(save);
  const blanks = [...current.definition.givens].map((digit, id) => digit === '0' ? id : -1).filter(id => id >= 0);
  const peers = (a: number, b: number) => Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9
    || Math.floor(a / 27) === Math.floor(b / 27) && Math.floor(a % 9 / 3) === Math.floor(b % 9 / 3);
  const entered = blanks.find(cell => [...current.definition.givens].some((digit, id) => digit !== '0' && peers(cell, id)));
  if (entered === undefined) throw Error('Puzzle fixture has no blank with an actual clue peer');
  const clue = [...current.definition.givens].findIndex((digit, id) => digit !== '0' && peers(entered, id));
  expect(peers(entered, clue)).toBe(true);
  const rowDigit = Number(current.definition.givens[clue]), noteCell = blanks.find(cell => cell !== entered)!;
  expect(rowDigit).toBeGreaterThan(0);
  await page.locator(`[data-cell="${entered}"]`).click(); await page.keyboard.press(String(rowDigit));
  await expect(page.locator(`[data-cell="${entered}"]`)).toHaveAttribute('data-conflict', 'true');
  await page.locator('.dock .more').click(); await page.getByRole('dialog').getByRole('button', { name: 'Notes', exact: true }).click();
  await page.locator(`[data-cell="${noteCell}"]`).click(); await page.keyboard.press('2'); await page.keyboard.press('7');
  await expect.poll(async () => attempt(await snapshot(page)).notes[noteCell]).toBe((1 << 1) | (1 << 6));
  const originalBounds = await bounds(page);
  await settings(page);
  await expect(page.getByRole('dialog').locator('footer [role="status"]')).toHaveCount(0);
  save = await snapshot(page); current = attempt(save);
  expect(current.entries[entered]).toBe(rowDigit); expect(current.undo.length).toBeGreaterThan(0);
  await choose(page, 'Theme', 'cauldron'); await expect(page.locator('.world')).toHaveAttribute('data-theme', 'cauldron');
  await choose(page, 'Appearance', 'dark'); await expect(page.locator('.world')).toHaveAttribute('data-appearance', 'dark');
  const changed = await snapshot(page);
  expect(logical(attempt(changed))).toEqual(logical(current));
  // Checkpoint sequence also advances for timing saves; it must never reset.
  expect(attempt(changed).commandSeq).toBeGreaterThanOrEqual(current.commandSeq);
  expect(attempt(changed).elapsedMs).toBeGreaterThanOrEqual(current.elapsedMs);
  expect(changed.profile).toEqual(save.profile);
  await closeDialogs(page); expect(await bounds(page)).toEqual(originalBounds);
  await expect(page.locator(`[data-cell="${noteCell}"] .note`)).toHaveCount(2);
  await expect(page.locator(`[data-cell="${entered}"] .conflict-mark`)).toHaveText('!');
  await page.keyboard.press('ArrowRight'); await expect(page.locator('.focus-dew')).toHaveCount(2);
  await settings(page); await choose(page, 'Appearance', 'system');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' }); await expect(page.locator('.world')).toHaveAttribute('data-appearance', 'light');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); await expect(page.locator('.world')).toHaveAttribute('data-appearance', 'dark');
  await closeDialogs(page);
  const beforeReload = attempt(await snapshot(page));
  await page.locator('.dock .more').click(); await page.getByRole('dialog').getByRole('button', { name: 'Main menu', exact: true }).click();
  await page.reload(); await ready(page); await expect(page.locator('.world')).toHaveAttribute('data-theme', 'cauldron');
  expect((await snapshot(page)).preferences).toMatchObject({ theme: 'cauldron', appearance: 'system' });
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await expect(page.locator('.cell')).toHaveCount(81);
  const resumed = attempt(await snapshot(page));
  // Navigation checkpoints legitimately advance timing metadata, not puzzle state.
  expect(logical(resumed)).toEqual(logical(beforeReload));
  expect(resumed.commandSeq).toBeGreaterThanOrEqual(beforeReload.commandSeq);
  expect(resumed.elapsedMs).toBeGreaterThanOrEqual(beforeReload.elapsedMs);
});

test('Auto refreshes on local boundary and resume while explicit Pond remains persisted', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-23T23:59:59-07:00')); await page.goto('/'); await ready(page);
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
  await page.clock.setFixedTime(new Date('2026-10-24T00:00:00-07:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'cauldron');
  await page.clock.setFixedTime(new Date('2026-11-07T23:59:59-08:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'cauldron');
  await page.clock.setFixedTime(new Date('2026-11-08T00:00:00-08:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
  expect((await snapshot(page)).preferences.theme).toBe('auto');
  await settings(page); await choose(page, 'Theme', 'pond'); await closeDialogs(page);
  await page.clock.setFixedTime(new Date('2027-10-31T12:00:00-07:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
  expect((await snapshot(page)).preferences.theme).toBe('pond'); await page.reload(); await ready(page);
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
});

test('failed lazy theme remains coherent and its modal recovery clears on the applied choice', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-01T12:00:00-07:00')); await page.goto('/'); await ready(page);
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
  await page.route(/\/src\/lib\/theme\/cauldron\.ts(?:\?|$)/, route => route.abort());
  await settings(page); await choose(page, 'Theme', 'cauldron');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(themeCopy.en.failed, { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: themeCopy.en.retry, exact: true })).toBeEnabled();
  await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
  await choose(page, 'Theme', 'pond');
  await expect(dialog.getByText(themeCopy.en.failed, { exact: true })).toHaveCount(0);
  await expect(page.locator('.theme-status')).toHaveCount(0);
  await closeDialogs(page); await expect(page.getByRole('button', { name: 'Quick Play', exact: true })).toBeEnabled();
});

for (const [width, height] of [[320, 568], [360, 800], [800, 360], [1280, 720]]) {
  test(`emulated ${width}x${height} themes, dialogs and three locales remain usable with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await page.clock.setFixedTime(new Date('2026-10-31T12:00:00-07:00'));
    await page.goto('/'); await ready(page);
    const titleFits = async () => page.locator('h1').evaluate(title => {
      const range = document.createRange(); range.selectNodeContents(title);
      const glyph = range.getBoundingClientRect(), anchor = title.getBoundingClientRect();
      return { left: glyph.left - anchor.left, right: anchor.right - glyph.right,
        viewportLeft: glyph.left, viewportRight: window.innerWidth - glyph.right };
    });
    for (const distance of Object.values(await titleFits())) expect(distance).toBeGreaterThanOrEqual(-.5);
    await page.screenshot({ path: `${evidence}/cauldron-${width}x${height}-menu.png` });
    await settings(page); await roundCorners(page);
    for (const locale of ['de', 'es', 'en'] as const) {
      const language = page.getByRole('dialog').getByRole('combobox', { name: /^(Language|Sprache|Idioma)$/ });
      await expect(language).toBeEnabled(); await language.selectOption(locale);
      await expect(page.getByRole('dialog').getByRole('combobox', { name: themeCopy[locale].theme, exact: true })).toBeEnabled();
      await expect(page.getByRole('dialog').getByRole('combobox', { name: themeCopy[locale].appearance, exact: true })).toBeEnabled();
      await expect(page.getByRole('dialog').getByRole('heading', { name: uiCopy[locale].settings, exact: true })).toBeVisible();
    }
    await choose(page, 'Theme', 'pond'); await expect(page.locator('.world')).toHaveAttribute('data-theme', 'pond');
    await closeDialogs(page);
    for (const distance of Object.values(await titleFits())) expect(distance).toBeGreaterThanOrEqual(-.5);
    await quick(page); const pondBounds = await bounds(page);
    await settings(page); await choose(page, 'Theme', 'cauldron'); await expect(page.locator('.world')).toHaveAttribute('data-theme', 'cauldron');
    await closeDialogs(page); expect(await bounds(page)).toEqual(pondBounds);
    await expect(page.locator('.dock button')).toHaveCount(10);
    const staticPose = await page.locator('.floating').first().getAttribute('style');
    await page.locator('.cell').first().focus(); await page.keyboard.press('ArrowRight');
    await expect(page.locator('.focus-dew')).toHaveCount(2);
    await page.locator('.dock .more').click(); await roundCorners(page);
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Notes', exact: true })).toBeEnabled();
    expect(await page.locator('.floating').first().getAttribute('style')).toBe(staticPose);
    await page.screenshot({ path: `${evidence}/cauldron-${width}x${height}-board-more.png` });
    await page.getByRole('dialog').getByRole('button', { name: 'Settings', exact: true }).click();
    await roundCorners(page);
    const motion = page.getByRole('dialog').getByRole('combobox', { name: 'Motion', exact: true });
    await motion.scrollIntoViewIfNeeded(); await expect(motion).toBeVisible();
    const scrollbar = await page.getByRole('dialog').evaluate(dialog => ({
      scroll: dialog.scrollHeight > dialog.clientHeight,
      color: getComputedStyle(dialog).scrollbarColor,
      track: getComputedStyle(dialog, '::-webkit-scrollbar-track').backgroundColor,
    }));
    expect(scrollbar.track).toBe('rgba(0, 0, 0, 0)');
    if (height <= 568) expect(scrollbar.scroll).toBe(true);
  });
}
