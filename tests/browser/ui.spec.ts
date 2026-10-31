import { expect, test } from '@playwright/test';
import { dictionaries } from '../../src/lib/i18n';
import { mkdir } from 'node:fs/promises';
import { leafShape } from '../../src/lib/leaves/shape';

const evidence = 'prototypes/production-ui-evidence';
test.beforeAll(async () => { await mkdir(evidence, { recursive: true }); });

for (const [width,height] of [[360,800],[800,360],[393,873],[873,393],[1280,720],[720,1000],[600,600]]) {
  test(`layout and selection ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({width,height}); await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/');
    await page.getByRole('button',{name:'Quick Play',exact:true}).click();
    await page.getByRole('button',{name:'Easy',exact:true}).click();
    await expect(page.locator('.cell')).toHaveCount(81);
    await expect(page.locator('.dock button')).toHaveCount(10);
    expect(await page.locator('.dock button').allTextContents()).toEqual(['1','2','3','4','5','6','7','8','9','•••']);
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
    await page.keyboard.press('Tab'); await expect(page.locator('.more')).toBeFocused();
    await expect(page.locator('.focus-dew')).toHaveCount(0);
    if(width===360||width===800||width===393||width===873||width===1280)await page.screenshot({path:`${evidence}/${width}x${height}-game.png`});
  });
}

test('More history, containment, repeated activation and rotation preserve board', async ({ page }) => {
  await page.setViewportSize({width:360,height:800}); await page.goto('/#board');
  await page.locator('[data-cell="42"]').click();
  const trigger=page.getByRole('button',{name:'More',exact:true});
  for(let repeat=0;repeat<3;repeat++) {
    await trigger.dblclick(); await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('button',{name:'Back to main menu',exact:true})).toBeFocused();
    await page.keyboard.press('Tab'); await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeFocused();
    if(repeat===0) {
      await page.screenshot({path:`${evidence}/360x800-more.png`});
      await page.setViewportSize({width:800,height:360});
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.screenshot({path:`${evidence}/800x360-more.png`});
    }
    if(repeat===0)await page.getByRole('button',{name:'Resume',exact:true}).dblclick({delay:80});
    else if(repeat===1)await page.keyboard.press('Escape');
    else await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(trigger).toBeFocused();
    await expect(page.locator('[data-cell="42"]')).toHaveAttribute('aria-pressed','true');
    await page.goForward(); await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await trigger.click(); await page.getByRole('button',{name:'Back to main menu',exact:true}).dblclick();
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
    await expect(page.getByRole('button',{name:copy.continueGame,exact:true})).toBeDisabled();
    await page.screenshot({path:`${evidence}/360x800-progression-${locale}.png`});
    for(const size of [{width:360,height:800},{width:800,height:360},{width:393,height:873},{width:873,height:393}]) {
      await page.setViewportSize(size);
      const fits=await page.locator('.menu-panel button').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight)); expect(fits).toBe(true);
    }
    await page.screenshot({path:`${evidence}/873x393-progression-${locale}.png`});
    await page.getByRole('button',{name:copy.newGame,exact:true}).click();
    await page.getByRole('button',{name:copy.more,exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for(const size of [{width:873,height:393},{width:360,height:800}]) {
      await page.setViewportSize(size); const r=await page.getByRole('dialog').boundingBox();expect(r!.x).toBeGreaterThanOrEqual(8);expect(r!.y).toBeGreaterThanOrEqual(8);
      await page.screenshot({path:`${evidence}/${size.width}x${size.height}-more-${locale}.png`});
    }
  });
}

test('initial/runtime reduced motion and stable hitboxes',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'}); await page.goto('/#board');
  const paths=()=>page.locator('[data-scene] path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));
  const fixed=()=>page.locator('.cell,.anchor').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  const still=await paths(),rects=await fixed(); await page.waitForTimeout(100); expect(await paths()).toEqual(still);
  await page.emulateMedia({reducedMotion:'no-preference'}); await expect.poll(paths).not.toEqual(still);expect(await fixed()).toEqual(rects);
  await page.emulateMedia({reducedMotion:'reduce'}); await expect.poll(paths).toEqual(still);expect(await fixed()).toEqual(rects);
});

test('touch notch targets and separate safe areas',async({browser})=>{
  const context=await browser.newContext({viewport:{width:393,height:873},hasTouch:true,isMobile:true});
  const page=await context.newPage();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:24,right:12,bottom:20,left:16}});
  await page.goto('http://127.0.0.1:5179/#board');
  await expect.poll(()=>page.locator('div.scene').evaluate(e=>e.getBoundingClientRect().x)).toBe(24);
  const scene=await page.locator('div.scene').boundingBox();
  expect(scene).toMatchObject({x:24,y:32,width:349,height:813});
  const id=40,shape=leafShape(id),anchor=await page.locator(`[data-cell="${id}"] .anchor`).boundingBox();
  await page.touchscreen.tap(anchor!.x+anchor!.width*(.5+.42*Math.cos(shape.notchAngle)),anchor!.y+anchor!.height*(.5+.42*Math.sin(shape.notchAngle)));
  await expect(page.locator(`[data-cell="${id}"]`)).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'More',exact:true}).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'Resume',exact:true}).tap();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator(`[data-cell="${id}"]`)).toHaveAttribute('aria-pressed','true');
  await context.close();
});

test('enlarged UI text and grayscale review fixture',async({page,context})=>{
  await page.setViewportSize({width:800,height:360}); await page.goto('/?lang=es');
  await page.addStyleTag({content:'.cream {font-size:32px !important}'});
  await page.getByRole('button',{name:dictionaries.es.progression,exact:true}).click();
  expect(await page.locator('.menu-panel button').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight))).toBe(true);
  await page.getByRole('button',{name:dictionaries.es.newGame,exact:true}).click();
  await page.getByRole('button',{name:dictionaries.es.more,exact:true}).click();
  expect(await page.getByRole('dialog').evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);
  await page.getByRole('button',{name:dictionaries.es.resume,exact:true}).click();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedVisionDeficiency',{type:'achromatopsia'});
  await page.screenshot({path:`${evidence}/800x360-grayscale.png`});
  await cdp.send('Emulation.setEmulatedVisionDeficiency',{type:'deuteranopia'});
  await page.screenshot({path:`${evidence}/800x360-deuteranopia.png`});
});
