import type { Page } from '@playwright/test';

export async function openSettings(page: Page) {
  await page.locator('#settings-toggle').click();
  await page.locator('#open-settings').click();
}

export async function closeSettings(page: Page) {
  await page.locator('#close-settings').click();
}

export async function setWheelZoom(page: Page, percent: 50 | 100 | 200) {
  const canvas=page.locator('#game canvas');
  await canvas.dispatchEvent('wheel',{deltaY:percent===200 ? -2000 : 2000});
  if(percent===100) await canvas.dispatchEvent('wheel',{deltaY:-600});
}
