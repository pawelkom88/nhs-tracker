import { test, expect } from '@playwright/test';
import { axeCheck } from './fixtures';

test.describe('Smoke test', () => {
  test('loads home page and passes axe accessibility check', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Know Your Wait/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.getByRole('link', { name: 'England', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wales', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Scotland', exact: true })).toBeVisible();

    await axeCheck(page);
  });
});
