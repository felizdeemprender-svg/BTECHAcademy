/**
 * E2E smoke público: páginas sin auth responden 200.
 * Sin escrituras de ningún tipo.
 */
import { expect, test } from '@playwright/test';

test('landing responde 200', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
});

test('auth responde 200', async ({ page }) => {
  const res = await page.goto('/auth');
  expect(res?.status()).toBe(200);
});
