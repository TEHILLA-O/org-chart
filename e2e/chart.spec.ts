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

test('dragged card stays where it is dropped', async ({ page }) => {
  await page.goto('/charts');
  await expect(page.getByText(/seats/i).first()).toBeVisible({ timeout: 30_000 });
  const node = page.locator('.react-flow__node').nth(3);
  await expect(node).toBeVisible({ timeout: 30_000 });
  const before = await node.evaluate((el) => el.getBoundingClientRect().x);
  const box = await node.boundingBox();
  if (!box) throw new Error('Chart node had no box');
  await page.mouse.move(box.x + box.width / 2, box.y + 24);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + 24 + 70, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const after = await node.evaluate((el) => el.getBoundingClientRect().x);
  expect(Math.abs(after - before)).toBeGreaterThan(80);
});
