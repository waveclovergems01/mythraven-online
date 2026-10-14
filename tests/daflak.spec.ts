import { test, expect } from '@playwright/test';
test.use({video: {mode:'on',size:{width:1280,height:720}}});

test('favicon assets decode and ICO has a valid container', async ({page,request}) => {
  await page.goto('/');
  const icons=await page.locator('link[rel="icon"]').evaluateAll(links=>links.map(x=>(x as HTMLLinkElement).href));
  expect(icons.length).toBe(3);
  for(const url of icons)expect((await request.get(url)).ok()).toBe(true);
  const ico=await (await request.get('/favicon.ico')).body();
  expect(ico.readUInt16LE(2)).toBe(1);expect(ico.readUInt16LE(4)).toBe(3);
  const size=await page.evaluate(async()=>{const img=new Image();img.src='/assets/icons/mythraven-32.png';await img.decode();return img.naturalWidth;});
  expect(size).toBe(32);
  const manifest=await (await request.get('/manifest.webmanifest')).json();
  for(const icon of manifest.icons)expect((await request.get(icon.src)).ok()).toBe(true);
});
