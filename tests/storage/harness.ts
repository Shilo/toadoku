import type { Page } from '@playwright/test';
export async function openNativeHarness(page: Page): Promise<void> {
  // Same HTTP origin for real IndexedDB. No app/HMR client in this module-level fixture.
  await page.route('**/__native-storage-harness', route => route.fulfill({ contentType: 'text/html',
    body: '<!doctype html><html lang="en"><meta charset="utf-8"><title>Native storage tests</title><body>Isolated native storage test</body></html>' }));
  await page.goto('/__native-storage-harness');
}
