import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  const svg = await readFile('public/pwa/icon.svg', 'utf8');
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
  for (const size of [192, 512]) { await page.setViewportSize({ width: size, height: size }); await page.screenshot({ path: `public/pwa/icon-${size}.png` }); }
  await page.screenshot({ path: 'public/pwa/maskable-512.png' });
} finally { await browser.close(); }
