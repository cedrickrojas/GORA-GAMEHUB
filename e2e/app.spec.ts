import { test, expect } from '@playwright/test';
test('discovery, joining, schedule and direct chat work through the real API', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/tabs/home');
  await expect(page.getByRole('heading', { name: 'What’s your game?' })).toBeVisible();
  await expect(page.locator('g-event-card').first()).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-home.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  expect((await page.request.post('/api/auth/demo')).ok()).toBe(true);
  await page.goto('/tabs/home');
  await expect(page.getByRole('heading', { name: 'What’s your game?' })).toBeVisible();
  await page.goto('/tabs/discover');
  await page
    .getByRole('searchbox', { name: 'Try ‘Basketball near Manila’' })
    .fill('Basketball near Manila');
  await expect(page.locator('g-event-card')).not.toHaveCount(0);
  await expect(page.locator('g-event-card').filter({ hasText: 'Football' })).toHaveCount(0);
  await expect(page.locator('.card-title').first()).toBeVisible();
  await page.locator('g-event-card .card-title').first().click();
  await expect(page.getByRole('heading', { name: 'About this game' })).toBeVisible();
  const join = page.getByRole('button', { name: 'Join game', exact: true });
  if (await join.isVisible()) {
    await join.click();
    await expect(page.getByRole('button', { name: 'Leave game', exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Open game chat' }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeVisible();
  const message = 'Game on — ' + Date.now();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill(message);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await page.goto('/tabs/schedule');
  await expect(page.getByRole('heading', { name: 'Your game plan.' })).toBeVisible();
  await expect(page.locator('.schedule-event').first()).toBeVisible();
  await page.goto('/tabs/profile');
  await expect(page.getByRole('heading', { name: 'Alex Reyes' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await expect(page.getByRole('heading', { name: 'Make it yours' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.goto('/people');
  await expect(page.locator('g-user-card').first()).toBeVisible();
  await page
    .locator('g-user-card')
    .first()
    .getByRole('button', { name: 'Invite', exact: true })
    .click();
  await expect(page.getByText('Choose a game you’ve joined or created.')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  expect(errors).toEqual([]);
});
test('hosts can publish, edit, invite and cancel; profile preferences persist', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  expect((await page.request.post('/api/auth/demo')).ok()).toBe(true);
  await page.goto('/tabs/home');
  await expect(page).toHaveURL(/tabs\/home/);
  await page.goto('/create-event');
  const title = `GORA verification ${info.project.name} ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Event title', exact: true }).fill(title);
  await page
    .getByRole('combobox', { name: 'Sport', exact: true })
    .selectOption({ label: 'Basketball' });
  await page.getByRole('textbox', { name: 'Venue', exact: true }).fill('GORA Test Court');
  await page.getByRole('button', { name: 'Publish game' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Edit game', exact: true }).click();
  await page.getByRole('textbox', { name: 'Event title', exact: true }).fill(title + ' updated');
  await page.getByRole('button', { name: 'Save game' }).click();
  await expect(page.getByRole('heading', { name: title + ' updated', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Invite friends', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bring your crew' })).toBeVisible();
  const inviteResponse = page.waitForResponse(
    (r) => r.url().includes('/invite') && r.request().method() === 'POST',
  );
  await page.locator('ion-modal .invite-list button').first().click();
  expect((await inviteResponse).ok()).toBe(true);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Cancel this game', exact: true }).click();
  await page.locator('ion-alert').getByRole('button', { name: 'Cancel game', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game cancelled', exact: true })).toBeVisible();
  await page.goto('/tabs/profile');
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page
    .getByRole('textbox', { name: 'Bio', exact: true })
    .fill('Weekend hooper. Lakers fan. Always down for a good game and even better company.');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make it yours' })).not.toBeVisible();
  await expect(
    page.getByText(
      'Weekend hooper. Lakers fan. Always down for a good game and even better company.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto('/tabs/discover?catalog=1');
  await expect(page.locator('g-sport-card')).toHaveCount(13);
  await page.locator('g-sport-card').filter({ hasText: 'Basketball' }).click();
  await expect(page.getByRole('heading', { name: /Basketball/ })).toBeVisible();
  expect(errors).toEqual([]);
});
