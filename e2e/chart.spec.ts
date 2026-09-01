import { test, expect } from '@playwright/test';

test('viewer can sign in and open the chart', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Work email').fill('owner@northstar.example');
  await page.getByLabel('Password').fill('OrgPulse!dev');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByText('Organisation pulse')).toBeVisible();
  await page.getByRole('link', { name: 'Charts' }).click();
  await expect(page.getByText(/positions/i).first()).toBeVisible({ timeout: 30_000 });
});
