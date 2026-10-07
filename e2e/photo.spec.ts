import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test('profile photos preview before saving, persist after reload, and can be replaced or removed', async ({
  page,
}, info) => {
  const username = 'photo_' + Date.now();
  const password = 'PhotoCheck' + Date.now() + '!';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const registration = await page.request.post('/api/auth/register', {
    data: {
      full_name: 'Photo Verification',
      username,
      email: username + '@test.example',
      password,
      confirm_password: password,
      date_of_birth: '1995-05-15',
      location: 'Makati, Manila',
      favorite_sports: ['Basketball'],
    },
  });
  expect(registration.status()).toBe(201);
  const user = await registration.json();
  const photo = await sharp({
    create: { width: 640, height: 480, channels: 3, background: '#ff642f' },
  })
    .png()
    .toBuffer();
  try {
    await page.goto('/tabs/profile');
    await expect(
      page.getByRole('heading', { name: 'Photo Verification', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Profile photo URL' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Upload photo', exact: true })).toBeVisible();
    const input = page.getByLabel('Profile photo', { exact: true });
    await input.setInputFiles({
      name: 'unsupported.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    });
    await expect(
      page.getByText('Choose a JPG, PNG, or WebP photo.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toBeDisabled();
    await input.setInputFiles({
      name: 'too-large.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(page.getByText('Choose a photo up to 5 MB.', { exact: true })).toBeVisible();
    await input.setInputFiles({ name: 'my-photo.png', mimeType: 'image/png', buffer: photo });
    await expect(page.locator('ion-modal .profile-photo-editor g-avatar img')).toHaveAttribute(
      'src',
      /^blob:/,
    );
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Make it yours' })).not.toBeVisible();
    expect((await (await page.request.get('/api/auth/me')).json()).avatar_url).toBeNull();

    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await page
      .getByLabel('Profile photo', { exact: true })
      .setInputFiles({ name: 'my-photo.png', mimeType: 'image/png', buffer: photo });
    await expect(page.getByText('my-photo.png', { exact: true })).toBeVisible();
    const preview = page.locator('ion-modal .profile-photo-editor g-avatar img');
    await expect(preview).toBeVisible();
    await expect
      .poll(() => preview.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await page.screenshot({
      path: `test-results/${info.project.name}-photo-preview.png`,
      animations: 'disabled',
    });
    const savedResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/users/' + user.id) && response.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    const saved = await savedResponse;
    expect(saved.status()).toBe(200);
    const stored = await saved.json();
    expect(stored.avatar_url).toMatch(/^\/api\/uploads\/avatars\//);
    await expect(page.getByRole('heading', { name: 'Make it yours' })).not.toBeVisible();
    await page.reload();
    await expect(page.locator('g-profile-header g-avatar img')).toHaveAttribute(
      'src',
      stored.avatar_url,
    );
    await expect(page.locator('g-profile-header g-avatar img')).toBeVisible();
    const image = await page.request.get(stored.avatar_url);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/webp');
    const metadata = await sharp(await image.body()).metadata();
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);

    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await page
      .getByLabel('Profile photo', { exact: true })
      .setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: photo });
    const replacementResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/users/' + user.id) && response.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    const replacement = await replacementResponse;
    expect(replacement.status()).toBe(200);
    const nextPhoto = (await replacement.json()).avatar_url;
    expect(nextPhoto).not.toBe(stored.avatar_url);
    await expect(page.getByRole('heading', { name: 'Make it yours' })).not.toBeVisible();
    expect((await page.request.get(stored.avatar_url)).status()).toBe(404);

    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Make it yours' })).not.toBeVisible();
    expect((await (await page.request.get('/api/auth/me')).json()).avatar_url).toBeNull();
    expect((await page.request.get(nextPhoto)).status()).toBe(404);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    expect(errors).toEqual([]);
  } finally {
    const cleanup = await page.request.delete('/api/users/' + user.id, { data: { password } });
    expect(cleanup.status()).toBe(200);
  }
});
