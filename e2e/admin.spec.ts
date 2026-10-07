import { test, expect } from '@playwright/test';
test('administrator can manage sports, review reports and save community settings', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  expect((await page.request.post('/api/auth/demo')).ok()).toBe(true);
  const me = await (await page.request.get('/api/auth/me')).json();
  test.skip(
    me.role !== 'admin',
    'Set SEED_ADMIN=true before the first seed or grant the local demo account admin access.',
  );
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Keep the game fair.' })).toBeVisible();
  await expect(page.getByText('Total users', { exact: true })).toBeVisible();
  await expect(page.locator('.sidebar, .topbar, g-bottom-navigation, g-create-button')).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Users', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Community roster' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Moderation' })).toBeVisible();
  await page.getByRole('button', { name: 'Events', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game management' })).toBeVisible();
  await page.getByRole('button', { name: 'Sports', exact: true }).click();
  await page
    .locator('.sport-admin-grid .panel')
    .filter({ has: page.getByRole('heading', { name: 'Basketball', exact: true }) })
    .getByRole('button', { name: 'Edit category' })
    .click();
  await expect(page.getByRole('heading', { name: 'Edit sport' })).toBeVisible();
  const sportSave = page.waitForResponse(
    (r) => r.url().includes('/admin/sports/') && r.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Save sport', exact: true }).click();
  expect((await sportSave).ok()).toBe(true);
  await expect(page.getByRole('heading', { name: 'Edit sport' })).not.toBeVisible();
  const people = await (await page.request.get('/api/people')).json();
  expect(
    (
      await page.request.post('/api/reports', {
        data: { user_id: people[0].id, reason: 'Browser verification report — review workflow.' },
      })
    ).ok(),
  ).toBe(true);
  await page.getByRole('button', { name: 'Reports', exact: true }).click();
  const report = page
    .locator('.report-card')
    .filter({ hasText: 'Browser verification report — review workflow.' })
    .filter({ has: page.getByRole('button', { name: 'Resolve report' }) })
    .first();
  await report.getByRole('button', { name: 'Resolve report' }).click();
  await page
    .locator('ion-alert textarea')
    .fill('Reviewed and resolved during application verification.');
  const reportSave = page.waitForResponse(
    (r) => r.url().includes('/admin/reports/') && r.request().method() === 'PUT',
  );
  await page.locator('ion-alert').getByRole('button', { name: 'Submit', exact: true }).click();
  expect((await reportSave).ok()).toBe(true);
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Send a community announcement' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Community settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});
