import { expect, test, type Page } from '@playwright/test';
import { dictionaries } from '../../src/lib/i18n';
import { appCopy } from '../../src/lib/gameplay/app-copy';
import { uiCopy } from '../../src/lib/gameplay/ui/copy';
import { mkdir } from 'node:fs/promises';
import { leafShape } from '../../src/lib/leaves/shape';

const evidence = 'prototypes/production-ui-evidence';
test.beforeAll(async () => { await mkdir(evidence, { recursive: true }); });
async function startQuick(page: Page, locale: 'en'|'de'|'es' = 'en', url = `/?lang=${locale}`) {
  await page.goto(url);
  await page.getByRole('button',{name:dictionaries[locale].quick,exact:true}).click();
  await page.getByRole('button',{name:dictionaries[locale].easy,exact:true}).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  await expect(page.locator('.dock button').first()).toBeEnabled();
}

test('frog sketch stays contained and fixed across responsive menu states',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [width,height] of [[320,568],[360,800],[800,360],[393,873],[873,393],[600,600],[720,1000],[1280,720],[1920,1080]]) {
    await page.setViewportSize({width,height}); await page.goto('/');
    const art=page.getByRole('img',{name:dictionaries.en.art});
    await expect.poll(()=>art.evaluate(e=>(e as HTMLImageElement).naturalWidth)).toBe(1254);
    const bounds=await art.boundingBox(); const slot=await page.locator('.art-slot').boundingBox();
    expect(bounds).toEqual(slot);
    expect(bounds!.x).toBeGreaterThanOrEqual(8); expect(bounds!.y).toBeGreaterThanOrEqual(8);
    expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width-8);
    expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(height-8);
    expect(await art.evaluate(e=>getComputedStyle(e).objectFit)).toBe('contain');
    expect(await art.evaluate(e=>{const img=e as HTMLImageElement;return img.naturalWidth===img.naturalHeight;})).toBe(true);
    const title=await page.locator('h1').boundingBox();
    expect(bounds!.x>=title!.x+title!.width || bounds!.y>=title!.y+title!.height).toBe(true);
    await page.getByRole('button',{name:'Quick Play',exact:true}).click();
    expect(await art.boundingBox()).toEqual(bounds);
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await page.getByRole('button',{name:'Progression',exact:true}).click();
    expect(await art.boundingBox()).toEqual(bounds);
    if([360,800,393,873,1280].includes(width))await page.screenshot({path:`${evidence}/sketch-${width}x${height}.png`});
  }
});

for (const [width,height] of [[360,800],[800,360],[393,873],[873,393],[1280,720],[720,1000],[600,600]]) {
  test(`layout and selection ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({width,height}); await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/');
    await page.getByRole('button',{name:'Quick Play',exact:true}).click();
    await page.getByRole('button',{name:'Easy',exact:true}).click();
    await expect(page.locator('.cell')).toHaveCount(81);
    await expect(page.locator('.dock button')).toHaveCount(10);
    expect((await page.locator('.dock button').allTextContents()).slice(0,9)).toEqual(['1','2','3','4','5','6','7','8','9']);
    await expect(page.locator('.dock button').last()).toHaveAccessibleName('More');
    const measurements = await page.evaluate(() => {
      const rect = (e: Element) => { const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}; };
      return {scene:rect(document.querySelector('div.scene')!),board:rect(document.querySelector('.board')!),dock:rect(document.querySelector('.dock')!),cells:[...document.querySelectorAll('.cell')].map(e=>({r:rect(e),a:rect(e.querySelector('.anchor')!)})),scroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};
    });
    expect(measurements.scroll).toBe(false);
    const {cells,board,dock,scene}=measurements;
    expect(scene.x).toBe(8); expect(scene.y).toBe(8);
    expect(width>height ? dock.x-board.x-board.w : dock.y-board.y-board.h).toBeCloseTo(8,1);
    expect(width>height ? board.w+dock.w+8 : board.h+dock.h+8).toBeCloseTo(width>height ? scene.w : scene.h,1);
    for(let i=0;i<81;i++) {
      const {r,a}=cells[i]; expect(a.w).toBeCloseTo(a.h,2);
      expect(a.x).toBeCloseTo(r.x+(r.w-a.w)*(1-(i%3)/2),1);
      expect(a.y).toBeCloseTo(r.y+(r.h-a.h)*(1-(Math.floor(i/9)%3)/2),1);
      if(i%9<8)expect(cells[i+1].r.x-r.x-r.w).toBeCloseTo(i%3===2?8:4,1);
      if(i<72)expect(cells[i+9].r.y-r.y-r.h).toBeCloseTo(Math.floor(i/9)%3===2?8:4,1);
      // Every fixed rectangle, including surrounding water, accepts its top-left point.
      await page.locator(`[data-cell="${i}"]`).click({position:{x:1,y:1}});
      await expect(page.locator(`[data-cell="${i}"]`)).toHaveAttribute('aria-pressed','true');
    }
    await page.locator('[data-cell="40"]').press('ArrowRight');
    await expect(page.locator('[data-cell="41"]')).toBeFocused();
    await expect(page.locator('.focus-dew')).toHaveCount(2);
    for (let digit=1;digit<=9;digit++) { await page.keyboard.press('Tab'); await expect(page.getByRole('button',{name:String(digit),exact:true})).toBeFocused(); }
    await page.keyboard.press('Tab'); await expect(page.locator('.more')).toBeFocused();
    await expect(page.locator('.focus-dew')).toHaveCount(0);
    if(width===360||width===800||width===393||width===873||width===1280)await page.screenshot({path:`${evidence}/${width}x${height}-game.png`});
  });
}

test('More history, containment, repeated activation and rotation preserve board', async ({ page }) => {
  await page.setViewportSize({width:360,height:800}); await startQuick(page);
  await page.locator('[data-cell="42"]').click();
  const trigger=page.getByRole('button',{name:'More',exact:true});
  for(let repeat=0;repeat<3;repeat++) {
    await trigger.click(); await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Game',exact:true})).toBeFocused();
    await page.getByRole('button',{name:'Close',exact:true}).focus();
    await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('button',{name:'Main menu',exact:true})).toBeFocused();
    await page.keyboard.press('Tab'); await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();
    if(repeat===0) {
      await page.screenshot({path:`${evidence}/360x800-more.png`});
      await page.setViewportSize({width:800,height:360});
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.screenshot({path:`${evidence}/800x360-more.png`});
    }
    if(repeat===0)await page.getByRole('button',{name:'Close',exact:true}).dblclick({delay:80});
    else if(repeat===1)await page.keyboard.press('Escape');
    else await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(trigger).toBeFocused();
    await expect(page.locator('[data-cell="42"]')).toHaveAttribute('aria-pressed','true');
    await page.goForward(); await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await trigger.click(); await page.getByRole('button',{name:'Main menu',exact:true}).dblclick();
  await expect(page.getByRole('button',{name:'Quick Play',exact:true})).toBeVisible();
  await page.goBack(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goForward(); await expect(page.getByRole('button',{name:'Quick Play',exact:true})).toBeVisible();
});

for(const locale of ['en','de','es'] as const) {
  test(`stable menu, translations and dialogs ${locale}`,async({page})=>{
    const copy=dictionaries[locale]; await page.setViewportSize({width:360,height:800});
    await page.emulateMedia({reducedMotion:'reduce'}); await page.goto(`/?lang=${locale}`);
    const anchors=async()=>page.locator('h1,.art-slot,[data-scene] path').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
    const initial=await anchors(); await page.screenshot({path:`${evidence}/360x800-menu-${locale}.png`});
    await page.getByRole('button',{name:copy.progression,exact:true}).click();
    expect(await anchors()).toEqual(initial);
    await expect(page.getByRole('button',{name:appCopy[locale].start,exact:true})).toBeEnabled();
    await expect(page.getByRole('button',{name:appCopy[locale].replay,exact:true})).toBeDisabled();
    await page.screenshot({path:`${evidence}/360x800-progression-${locale}.png`});
    for(const size of [{width:360,height:800},{width:800,height:360},{width:393,height:873},{width:873,height:393}]) {
      await page.setViewportSize(size);
      const fits=await page.locator('.menu-panel button').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight)); expect(fits).toBe(true);
    }
    await page.screenshot({path:`${evidence}/873x393-progression-${locale}.png`});
    await page.getByRole('button',{name:appCopy[locale].start,exact:true}).click();
    await expect(page.locator('.cell')).toHaveCount(81);
    await page.getByRole('button',{name:copy.more,exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for(const size of [{width:873,height:393},{width:360,height:800}]) {
      await page.setViewportSize(size); const r=await page.getByRole('dialog').boundingBox();expect(r!.x).toBeGreaterThanOrEqual(8);expect(r!.y).toBeGreaterThanOrEqual(8);
      await page.screenshot({path:`${evidence}/${size.width}x${size.height}-more-${locale}.png`});
    }
  });
}

test('initial/runtime reduced motion and stable hitboxes',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'}); await startQuick(page);
  const paths=()=>page.locator('[data-scene] path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));
  const fixed=()=>page.locator('.cell,.anchor').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  const still=await paths(),rects=await fixed(); await page.waitForTimeout(100); expect(await paths()).toEqual(still);
  await page.emulateMedia({reducedMotion:'no-preference'}); await expect.poll(paths).not.toEqual(still);expect(await fixed()).toEqual(rects);
  await page.emulateMedia({reducedMotion:'reduce'}); await expect.poll(paths).toEqual(still);expect(await fixed()).toEqual(rects);
});

test('touch notch targets and separate safe areas',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL,viewport:{width:393,height:873},hasTouch:true,isMobile:true});
  const page=await context.newPage();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:24,right:12,bottom:20,left:16}});
  await startQuick(page);
  await expect.poll(()=>page.locator('div.scene').evaluate(e=>e.getBoundingClientRect().x)).toBe(24);
  const scene=await page.locator('div.scene').boundingBox();
  expect(scene).toMatchObject({x:24,y:32,width:349,height:813});
  const id=40,shape=leafShape(id),anchor=await page.locator(`[data-cell="${id}"] .anchor`).boundingBox();
  await page.touchscreen.tap(anchor!.x+anchor!.width*(.5+.42*Math.cos(shape.notchAngle)),anchor!.y+anchor!.height*(.5+.42*Math.sin(shape.notchAngle)));
  await expect(page.locator(`[data-cell="${id}"]`)).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'More',exact:true}).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'Close',exact:true}).tap();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator(`[data-cell="${id}"]`)).toHaveAttribute('aria-pressed','true');
  await context.close();
});

test('enlarged UI text and grayscale review fixture',async({page,context})=>{
  await page.setViewportSize({width:800,height:360}); await page.goto('/?lang=es');
  await page.addStyleTag({content:'.cream {font-size:32px !important}'});
  await page.getByRole('button',{name:dictionaries.es.progression,exact:true}).click();
  expect(await page.locator('.menu-panel button').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight))).toBe(true);
  await page.getByRole('button',{name:appCopy.es.start,exact:true}).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  await page.getByRole('button',{name:dictionaries.es.more,exact:true}).click();
  const dialog = page.getByRole('dialog');
  expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  const dialogBounds=await dialog.boundingBox();
  expect(dialogBounds!.x).toBeGreaterThanOrEqual(8); expect(dialogBounds!.y).toBeGreaterThanOrEqual(8);
  expect(dialogBounds!.x+dialogBounds!.width).toBeLessThanOrEqual(792); expect(dialogBounds!.y+dialogBounds!.height).toBeLessThanOrEqual(352);
  await page.getByRole('button',{name:uiCopy.es.mainMenu,exact:true}).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button',{name:uiCopy.es.mainMenu,exact:true})).toBeInViewport();
  await page.getByRole('button',{name:uiCopy.es.close,exact:true}).scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:uiCopy.es.close,exact:true}).click();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedVisionDeficiency',{type:'achromatopsia'});
  await page.screenshot({path:`${evidence}/800x360-grayscale.png`});
  await cdp.send('Emulation.setEmulatedVisionDeficiency',{type:'deuteranopia'});
  await page.screenshot({path:`${evidence}/800x360-deuteranopia.png`});
});
