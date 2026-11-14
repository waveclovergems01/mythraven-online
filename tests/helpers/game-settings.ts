import type { Page } from '@playwright/test';

export async function openSettings(page: Page) {
  await page.locator('#settings-toggle').click();
  await page.locator('#open-settings').click();
}

export async function closeSettings(page: Page) {
  await page.locator('#close-settings').click();
}
