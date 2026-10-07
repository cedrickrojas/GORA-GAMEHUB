import { test, expect } from '@playwright/test';

test('admin login opens only the control room, redirects app URLs, and supports sign out', async ({
  page,
}, info) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for an existing administrator.',
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/login?returnUrl=/tabs/profile');
  await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Total users', { exact: true })).toBeVisible();
  await expect(page.locator('.sidebar, .topbar, g-bottom-navigation, g-create-button')).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/${info.project.name}-admin-dashboard.png`,
    fullPage: true,
    animations: 'disabled',
  });

  for (const [tab, heading] of [
    ['Users', 'Community roster'],
    ['Events', 'Game management'],
    ['Sports', 'Sports categories'],
    ['Notifications', 'Send a community announcement'],
    ['Settings', 'Community settings'],
  ]) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
    expect(
      await page
        .locator('a[href]')
        .evaluateAll((links) => links.every((link) => link.getAttribute('href') === '/admin')),
    ).toBe(true);
  }
  for (const path of [
    '/',
    '/tabs/home',
    '/tabs/discover?q=basketball',
    '/people',
    '/tabs/schedule',
    '/tabs/messages',
    '/tabs/profile',
    '/create-event',
    '/notifications',
    '/communities',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/user/example',
    '/event/example',
    '/sports/example',
    '/edit-event/example',
    '/community/example',
    '/missing-page',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('Total users', { exact: true })).toBeVisible();
    await expect(
      page.locator('.sidebar, .topbar, g-bottom-navigation, g-create-button'),
    ).toHaveCount(0);
  }
  await page.reload();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Total users', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  expect((await page.request.get('/api/admin/dashboard')).status()).toBe(401);
  expect(errors).toEqual([]);
});

test('regular users keep sports navigation and cannot open the admin dashboard', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/demo')).ok()).toBe(true);
  const user = await (await page.request.get('/api/auth/me')).json();
  test.skip(user.role === 'admin', 'This check needs a normal user demo account.');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/tabs\/home$/);
  await expect(page.locator('g-bottom-navigation')).toHaveCount(1);
  await expect(page.locator('g-create-button')).toHaveCount(2);
  expect((await page.request.get('/api/admin/dashboard')).status()).toBe(403);
  await page.goto('/tabs/profile');
  await expect(page.getByRole('heading', { name: user.full_name, exact: true })).toBeVisible();
});
