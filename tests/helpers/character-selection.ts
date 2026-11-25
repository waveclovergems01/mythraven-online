import { expect, type Page } from '@playwright/test';
import { characterById } from '../../shared/character-catalog.mjs';

export async function selectAppearance(page: Page, id: string) {
  const character = characterById(id);
  if (!character) throw new Error('Unknown character: ' + id);
  await page.locator(`input[name="character-class"][value="${character.classId}"]`).check();
  await page.locator(`input[name="character-hair"][value="${character.hairStyle}"]`).check();
}

export async function chooseCharacter(page: Page, id = 'novice-male-01') {
  await expect(page.locator('#character-title')).toBeVisible({ timeout: 30000 });
  await selectAppearance(page, id);
  await expect(page.locator('#enter-city')).toBeEnabled({ timeout: 30000 });
  await page.locator('#enter-city').click();
  await expect(page.locator('.scene-loading')).toBeHidden({timeout:60000});
}
