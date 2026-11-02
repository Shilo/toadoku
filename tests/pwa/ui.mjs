const settingsName = /^(Settings|Einstellungen|Ajustes)$/;

/** Supports both preserved builds' direct Settings and the current compact More menu. */
export async function openMenuSettings(page) {
  await page.locator('.menu-more').click();
  const dialog = page.getByRole('dialog');
  // A lazy loading dialog is visible briefly before the real pane is mounted.
  await dialog.locator('#game-dialog-title').waitFor({ state: 'visible' });
  const settings = dialog.getByRole('button', { name: settingsName });
  if (await settings.count()) await settings.click();
  await dialog.getByRole('heading', { name: settingsName }).waitFor({ state: 'visible' });
}
