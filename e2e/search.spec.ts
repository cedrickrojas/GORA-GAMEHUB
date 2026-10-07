import { test, expect } from '@playwright/test';
import pg from 'pg';

test('home search finds real people and games with follow, chat, and join workflows', async ({
  page,
  playwright,
}, info) => {
  const nonce = Date.now().toString();
  const password = 'SearchCheck' + nonce + '!';
  const hostName = 'Search Teammate ' + nonce;
  const hostUsername = 'searchhost_' + nonce;
  const hostContext = await playwright.request.newContext({ baseURL: info.project.use.baseURL });
  const account = (username: string, full_name: string) => ({
    full_name,
    username,
    email: username + '@test.example',
    password,
    confirm_password: password,
    date_of_birth: '1995-05-15',
    location: 'Manila',
    favorite_sports: ['Basketball'],
  });
  let hostId: string | undefined, viewerId: string | undefined, conversationId: string | undefined;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const registeredHost = await hostContext.post('/api/auth/register', {
      data: account(hostUsername, hostName),
    });
    expect(registeredHost.status()).toBe(201);
    hostId = (await registeredHost.json()).id;
    const registeredViewer = await page.request.post('/api/auth/register', {
      data: account('searchviewer_' + nonce, 'Search Player'),
    });
    expect(registeredViewer.status()).toBe(201);
    viewerId = (await registeredViewer.json()).id;
    const sports = await (await page.request.get('/api/sports')).json();
    const gameTitle = 'GORA Search Game ' + nonce;
    const fields = {
      title: gameTitle,
      sport_id: sports.find((s: any) => s.name === 'Basketball').id,
      description: 'A game created to verify real search results.',
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      ends_at: new Date(Date.now() + 90000000).toISOString(),
      location: 'Manila',
      venue: 'GORA Search Court',
      max_participants: 8,
      required_participants: 2,
      type: 'Play a Game',
      skill_level: 'Any',
      privacy: 'Public',
    };
    const created = await hostContext.post('/api/events', { data: fields });
    expect(created.status()).toBe(201);
    const gameId = (await created.json()).id;
    expect(
      (
        await hostContext.post('/api/events', {
          data: { ...fields, title: gameTitle + ' Private', privacy: 'Private' },
        })
      ).status(),
    ).toBe(201);

    await page.goto('/tabs/home');
    const homeSearch = page.locator(
      info.project.name === 'mobile' ? '.mobile-home-search g-search' : '.topbar g-search',
    );
    await homeSearch.getByRole('searchbox').fill('@' + hostUsername);
    await expect(homeSearch.locator('.search-submit svg')).toBeVisible();
    if (info.project.name === 'mobile') await homeSearch.getByRole('searchbox').press('Enter');
    else await homeSearch.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/\/search\?q=/);
    const searchInput = page.getByRole('searchbox', {
      name: 'Search people, usernames, games, or places',
      exact: true,
    });
    await expect(page.locator('g-user-card')).toHaveCount(1);
    const person = page.locator('g-user-card').filter({ hasText: hostName });
    await expect(person).toBeVisible();
    await person.getByRole('button', { name: 'Follow', exact: true }).click();
    await expect(person.getByRole('button', { name: 'Following', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.reload();
    await expect(person.getByRole('button', { name: 'Following', exact: true })).toBeVisible();
    await person.getByRole('button', { name: 'Following', exact: true }).click();
    await expect(person.getByRole('button', { name: 'Follow', exact: true })).toBeVisible();
    await person.getByRole('link', { name: 'View profile' }).click();
    await expect(page.getByRole('heading', { name: hostName, exact: true })).toBeVisible();
    await page.goBack();
    await person.getByRole('button', { name: 'Message', exact: true }).click();
    await expect(page).toHaveURL(/\/tabs\/messages\?conversation=/);
    conversationId = new URL(page.url()).searchParams.get('conversation')!;
    const message = 'Found your game on GORA — ' + nonce;
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill(message);
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    expect(
      (
        await (await hostContext.get('/api/conversations/' + conversationId + '/messages')).json()
      ).some((m: any) => m.body === message),
    ).toBe(true);

    await page.goto('/search');
    await searchInput.fill(gameTitle);
    await expect(page.locator('g-event-card')).toHaveCount(1);
    const game = page.locator('g-event-card').filter({ hasText: gameTitle });
    await expect(game).toBeVisible();
    await page.getByRole('button', { name: 'Games', exact: true }).click();
    await expect(page.locator('g-user-card')).toHaveCount(0);
    await game.getByRole('button', { name: 'Join game', exact: true }).click();
    await expect(game.getByRole('button', { name: 'Joined', exact: true })).toBeVisible();
    await page.screenshot({
      path: `test-results/${info.project.name}-search-games.png`,
      fullPage: true,
      animations: 'disabled',
    });
    const detail = await (await page.request.get('/api/events/' + gameId)).json();
    expect(detail.joined_status).toBe('approved');
    expect(detail.participant_list.some((p: any) => p.id === viewerId)).toBe(true);
    await game.locator('.card-title').click();
    await expect(page.getByRole('heading', { name: gameTitle, exact: true })).toBeVisible();
    await page.goBack();
    await expect(searchInput).toHaveValue(gameTitle);
    await page.getByRole('button', { name: 'People', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'No results yet', exact: true })).toBeVisible();
    await searchInput.fill(hostName);
    await expect(person).toBeVisible();
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.screenshot({
      path: `test-results/${info.project.name}-search-people.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await searchInput.fill('NoMatches' + nonce);
    await expect(page.getByRole('heading', { name: 'No results yet', exact: true })).toBeVisible();
    await page
      .locator('.search-results-input')
      .getByRole('button', { name: 'Clear search', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Your next crew starts here', exact: true }),
    ).toBeVisible();
    await searchInput.fill('Basketball near Manila');
    await expect(page.locator('g-event-card').filter({ hasText: gameTitle })).toBeVisible();
    await searchInput.fill('Basketball');
    await page.getByRole('button', { name: 'Sports', exact: true }).click();
    await expect(page.locator('g-sport-card')).toHaveCount(1);
    await page.locator('g-sport-card').click();
    await expect(page).toHaveURL(/\/sports\//);
    await expect(page.locator('g-event-card').filter({ hasText: gameTitle })).toBeVisible();
    await page.goto('/people');
    await page.getByRole('searchbox', { name: 'Search people or places' }).fill('@' + hostUsername);
    await expect(person).toBeVisible();
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(page.locator('g-user-card')).toHaveCount(1);
    await expect(person.getByRole('button', { name: 'Follow', exact: true })).toBeVisible();
    await expect(person.getByRole('button', { name: 'Message', exact: true })).toBeVisible();
    await page.goto('/tabs/discover');
    await page.locator('.discovery-toolbar').getByRole('searchbox').fill(gameTitle);
    await expect(page.locator('g-event-card')).toHaveCount(1);
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(game.getByRole('button', { name: 'Joined', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    if (conversationId && hostId && viewerId && process.env.DATABASE_URL) {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      try {
        await pool.query('DELETE FROM conversations WHERE id=$1 AND direct_key=$2', [
          conversationId,
          [hostId, viewerId].sort().join(':'),
        ]);
      } finally {
        await pool.end();
      }
    }
    if (viewerId)
      expect(
        (await page.request.delete('/api/users/' + viewerId, { data: { password } })).status(),
      ).toBe(200);
    if (hostId)
      expect(
        (await hostContext.delete('/api/users/' + hostId, { data: { password } })).status(),
      ).toBe(200);
    await hostContext.dispose();
  }
});
