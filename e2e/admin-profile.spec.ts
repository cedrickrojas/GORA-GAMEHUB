import { test, expect } from '@playwright/test';
import pg from 'pg';
import sharp from 'sharp';

test('admin edits their own profile and photo inside the dashboard', async ({ page }, info) => {
  test.skip(
    !process.env.DATABASE_URL,
    'Use the local API database URL to provision an isolated test administrator.',
  );
  const username = 'adminprofile_' + Date.now();
  const password = 'AdminProfile' + Date.now() + '!';
  const email = username + '@test.example';
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const registration = await page.request.post('/api/auth/register', {
    data: {
      full_name: 'Admin Profile Check',
      username,
      email,
      password,
      confirm_password: password,
      date_of_birth: '1995-05-15',
      location: 'Makati',
      favorite_sports: ['Basketball'],
    },
  });
  expect(registration.status()).toBe(201);
  const user = await registration.json();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const promotion = await pool.query(
      "UPDATE users SET role='admin' WHERE id=$1 AND email=$2 AND role='user' RETURNING id",
      [user.id, email],
    );
    expect(promotion.rowCount).toBe(1);
    await pool.query("UPDATE profiles SET location='' WHERE user_id=$1", [user.id]);
    await pool.query('DELETE FROM user_sports WHERE user_id=$1', [user.id]);
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Edit admin profile', exact: true }),
    ).toBeVisible();
    const form = page.locator('ion-modal form');
    const save = form.getByRole('button', { name: 'Save profile', exact: true });
    await expect(save).toBeEnabled();
    await form.getByRole('textbox', { name: 'Full name', exact: true }).fill('');
    await expect(save).toBeDisabled();
    await form.getByRole('textbox', { name: 'Full name', exact: true }).fill('Unsaved Admin');
    const photo = await sharp({
      create: { width: 600, height: 400, channels: 3, background: '#ff642f' },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel('Profile photo', { exact: true })
      .setInputFiles({ name: 'admin-photo.png', mimeType: 'image/png', buffer: photo });
    await expect(page.locator('ion-modal g-avatar img')).toHaveAttribute('src', /^blob:/);
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Edit admin profile', exact: true }),
    ).not.toBeVisible();
    expect((await (await page.request.get('/api/auth/me')).json()).full_name).toBe(
      'Admin Profile Check',
    );
    expect((await (await page.request.get('/api/auth/me')).json()).avatar_url).toBeNull();

    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await form
      .getByRole('textbox', { name: 'Full name', exact: true })
      .fill('Updated Administrator');
    await form
      .getByRole('textbox', { name: 'Bio', exact: true })
      .fill('Keeping the community in the game.');
    await page
      .getByLabel('Profile photo', { exact: true })
      .setInputFiles({ name: 'admin-photo.png', mimeType: 'image/png', buffer: photo });
    await expect
      .poll(() =>
        page
          .locator('ion-modal g-avatar img')
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    await page.screenshot({
      path: `test-results/${info.project.name}-admin-profile.png`,
      animations: 'disabled',
    });
    const response = page.waitForResponse(
      (r) => r.url().endsWith('/api/users/' + user.id) && r.request().method() === 'PUT',
    );
    await save.click();
    expect((await response).status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Edit admin profile', exact: true }),
    ).not.toBeVisible();
    await expect(page.locator('.admin-header g-avatar img')).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
    await page.reload();
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await expect(form.getByRole('textbox', { name: 'Full name', exact: true })).toHaveValue(
      'Updated Administrator',
    );
    await expect(form.getByRole('textbox', { name: 'Bio', exact: true })).toHaveValue(
      'Keeping the community in the game.',
    );
    const stored = await (await page.request.get('/api/auth/me')).json();
    expect(stored.role).toBe('admin');
    expect(stored.favorite_sports).toEqual([]);
    expect(stored.location).toBe('');
    const image = await page.request.get(stored.avatar_url);
    expect(image.status()).toBe(200);
    expect((await sharp(await image.body()).metadata()).format).toBe('webp');
    await form.getByRole('textbox', { name: 'Location' }).fill('Manila');
    await form.getByRole('button', { name: 'Remove photo', exact: true }).click();
    await save.click();
    await expect(
      page.getByRole('heading', { name: 'Edit admin profile', exact: true }),
    ).not.toBeVisible();
    expect((await (await page.request.get('/api/auth/me')).json()).location).toBe('Manila');
    expect((await (await page.request.get('/api/auth/me')).json()).avatar_url).toBeNull();
    expect((await page.request.get(stored.avatar_url)).status()).toBe(404);
    await expect(
      page.locator('.sidebar, .topbar, g-bottom-navigation, g-create-button'),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.goto('/search?q=basketball');
    await expect(page).toHaveURL(/\/admin$/);
  } finally {
    await pool.end();
    expect(
      (await page.request.delete('/api/users/' + user.id, { data: { password } })).status(),
    ).toBe(200);
  }
});
