import { expect, type Page } from '@playwright/test';

export async function chooseCharacter(page: Page, id = 'novice-male-01') {
  await expect(page.locator('#character-title')).toBeVisible({ timeout: 30000 });
  await page.locator(`input[name="character"][value="${id}"]`).check();
  await expect(page.locator('#enter-city')).toBeEnabled({ timeout: 30000 });
  await page.locator('#enter-city').click();
  await expect(page.locator('.scene-loading')).toBeHidden({timeout:60000});
}
