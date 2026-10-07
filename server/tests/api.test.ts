import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import sharp from 'sharp';
import { rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
process.env.DATABASE_URL = '';
const uploadRoot = resolve('.data', 'test-uploads-' + randomBytes(8).toString('hex'));
process.env.UPLOAD_DIR = uploadRoot;
process.env.EMBEDDED_DB_PATH = 'memory://';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.SEED_DEMO = 'false';
const { app } = await import('../src/app.js');
const { db, migrate, closeDb } = await import('../src/database/db.js');
const host = request.agent(app),
  player = request.agent(app),
  other = request.agent(app),
  admin = request.agent(app);
let sportId: string, hostId: string, playerId: string, otherId: string, adminId: string;
const password = 'GameTime2026!';
const account = (name: string) => ({
  full_name: name,
  username: name.toLowerCase(),
  email: name.toLowerCase() + '@test.example',
  password,
  confirm_password: password,
  date_of_birth: '1995-05-15',
  location: 'Makati, Manila',
  favorite_sports: ['Basketball'],
});
const game = (overrides: Record<string, unknown> = {}) => ({
  title: 'Test Basketball Run',
  sport_id: sportId,
  description: 'A friendly pickup game.',
  starts_at: new Date(Date.now() + 86400000).toISOString(),
  ends_at: new Date(Date.now() + 90000000).toISOString(),
  location: 'Makati, Manila',
  venue: 'Test Court',
  max_participants: 3,
  required_participants: 2,
  type: 'Play a Game',
  skill_level: 'Any',
  privacy: 'Public',
  ...overrides,
});
before(async () => {
  await migrate();
  sportId = (
    await db.query(
      "INSERT INTO sports(name,slug,icon,description,image_url) VALUES('Basketball','basketball','basketball','Local basketball games','https://images.unsplash.com/photo-1546519638-68e109498ffc') RETURNING id",
    )
  ).rows[0].id;
  const h = await host.post('/api/auth/register').send(account('Host'));
  assert.equal(h.status, 201);
  hostId = h.body.id;
  const p = await player.post('/api/auth/register').send(account('Player'));
  assert.equal(p.status, 201);
  playerId = p.body.id;
  const o = await other.post('/api/auth/register').send(account('Other'));
  assert.equal(o.status, 201);
  otherId = o.body.id;
  const a = await admin.post('/api/auth/register').send(account('Admin'));
  assert.equal(a.status, 201);
  adminId = a.body.id;
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [adminId]);
});
after(async () => {
  await closeDb();
  assert.ok(uploadRoot.startsWith(resolve('.data') + sep));
  await rm(uploadRoot, { recursive: true, force: true });
});
test('registration validates age, password, sport and uniqueness; passwords are hashed', async () => {
  const weak = await request(app)
    .post('/api/auth/register')
    .send({ ...account('Weak'), password: 'weak', confirm_password: 'weak' });
  assert.equal(weak.status, 400);
  assert.equal(
    (
      await request(app)
        .post('/api/auth/register')
        .send({ ...account('Young'), date_of_birth: new Date().toISOString().slice(0, 10) })
    ).status,
    400,
  );
  assert.equal((await request(app).post('/api/auth/register').send(account('Host'))).status, 409);
  assert.equal(
    (
      await request(app)
        .post('/api/auth/register')
        .send({ ...account('Missing'), favorite_sports: ['Unknown'] })
    ).status,
    400,
  );
  const u = (await db.query('SELECT password_hash FROM users WHERE id=$1', [hostId])).rows[0];
  assert.match(u.password_hash, /^\$2[ab]\$12\$/);
  assert.notEqual(u.password_hash, password);
});
test('JWT sessions protect changes, reject bad logins and CSRF origins', async () => {
  assert.equal((await request(app).post('/api/events').send(game())).status, 401);
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'host@test.example', password: 'wrong' })
    ).status,
    401,
  );
  assert.equal((await host.get('/api/auth/me')).body.id, hostId);
  assert.equal(
    (await host.post('/api/events').set('Origin', 'https://evil.example').send(game())).status,
    403,
  );
  assert.equal((await request(app).post('/api/auth/demo')).status, 404);
});
test('public events persist, validate scheduling, and enforce host authorization', async () => {
  assert.equal(
    (await host.post('/api/events').send(game({ ends_at: new Date(Date.now()).toISOString() })))
      .status,
    400,
  );
  const created = await host.post('/api/events').send(game());
  assert.equal(created.status, 201);
  const e = created.body;
  const detail = await player.get('/api/events/' + e.id);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.participants, 1);
  assert.equal(
    (await player.put('/api/events/' + e.id).send(game({ title: 'Stolen' }))).status,
    403,
  );
  assert.equal((await player.delete('/api/events/' + e.id)).status, 403);
  assert.equal(
    (await host.put('/api/events/' + e.id).send(game({ title: 'Updated Run' }))).status,
    200,
  );
  assert.equal(
    (await request(app).get('/api/events?q=Basketball%20near%20Manila')).body.some(
      (g: any) => g.id === e.id,
    ),
    true,
  );
  assert.equal(
    (await request(app).get('/api/events?q=' + encodeURIComponent("';DROP TABLE users;--"))).status,
    200,
  );
  assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 4);
});
test('joining is idempotent and event locks prevent concurrent overbooking', async () => {
  const e = (await host.post('/api/events').send(game({ max_participants: 2 }))).body;
  const joins = await Promise.all([
    player.post('/api/events/' + e.id + '/join'),
    other.post('/api/events/' + e.id + '/join'),
  ]);
  assert.deepEqual(joins.map((j) => j.status).sort(), [200, 409]);
  const winner = joins[0].status === 200 ? player : other;
  assert.equal((await winner.post('/api/events/' + e.id + '/join')).status, 200);
  assert.equal((await host.get('/api/events/' + e.id)).body.participants, 2);
  assert.equal(
    (
      await host
        .put('/api/events/' + e.id)
        .send(game({ max_participants: 2, required_participants: 1 }))
    ).status,
    200,
  );
  assert.equal((await host.delete('/api/events/' + e.id + '/leave')).status, 409);
  assert.equal((await winner.delete('/api/events/' + e.id + '/leave')).status, 200);
  assert.equal((await host.get('/api/events/' + e.id)).body.participants, 1);
});
test('private games hide details, require host approval, and protect chat membership', async () => {
  const e = (await host.post('/api/events').send(game({ privacy: 'Private' }))).body;
  assert.equal((await player.get('/api/events/' + e.id)).status, 404);
  assert.equal((await player.post('/api/events/' + e.id + '/join')).status, 403);
  assert.equal(
    (await request(app).get('/api/events')).body.some((g: any) => g.id === e.id),
    false,
  );
  assert.equal(
    (await host.post('/api/events/' + e.id + '/invite').send({ user_id: playerId })).status,
    201,
  );
  assert.equal((await player.get('/api/events/' + e.id)).status, 200);
  assert.equal((await player.post('/api/events/' + e.id + '/join')).body.status, 'pending');
  const c = (await host.get('/api/events/' + e.id)).body.conversation_id;
  assert.equal((await player.get('/api/conversations/' + c + '/messages')).status, 403);
  assert.equal(
    (
      await player
        .put('/api/events/' + e.id + '/participants/' + otherId)
        .send({ action: 'approve' })
    ).status,
    403,
  );
  assert.equal(
    (
      await host
        .put('/api/events/' + e.id + '/participants/' + playerId)
        .send({ action: 'approve' })
    ).status,
    200,
  );
  assert.equal(
    (
      await player
        .post('/api/conversations/' + c + '/messages')
        .send({ body: 'Ready for the game!' })
    ).status,
    201,
  );
  assert.equal(
    (await host.get('/api/conversations/' + c + '/messages')).body.at(-1).body,
    'Ready for the game!',
  );
  assert.equal((await other.get('/api/conversations/' + c + '/messages')).status, 403);
  await host.put('/api/events/' + e.id + '/participants/' + playerId).send({ action: 'remove' });
  assert.equal((await player.get('/api/conversations/' + c + '/messages')).status, 403);
});
test('friends-only games respect accepted friendships, requests and followers are consistent', async () => {
  const e = (await host.post('/api/events').send(game({ privacy: 'Friends' }))).body;
  assert.equal((await other.post('/api/events/' + e.id + '/join')).status, 403);
  assert.equal((await other.post('/api/friends/' + hostId + '/request')).status, 201);
  assert.equal((await host.post('/api/friends/' + otherId + '/request')).status, 409);
  assert.equal((await other.post('/api/friends/' + hostId + '/accept')).status, 404);
  assert.equal((await host.post('/api/friends/' + otherId + '/accept')).status, 200);
  assert.equal((await other.post('/api/events/' + e.id + '/join')).status, 200);
  await other.post('/api/people/' + hostId + '/follow');
  await other.post('/api/people/' + hostId + '/follow');
  assert.equal((await host.get('/api/users/' + hostId)).body.followers, 1);
  assert.equal((await other.post('/api/people/' + otherId + '/follow')).status, 400);
  assert.equal((await other.delete('/api/friends/' + hostId)).status, 200);
});
test('direct chats reuse the conversation, escape content as data, and reject outsiders', async () => {
  const c = (await host.post('/api/conversations').send({ user_id: playerId })).body;
  const again = (await player.post('/api/conversations').send({ user_id: hostId })).body;
  assert.equal(c.id, again.id);
  assert.equal(
    (await other.post('/api/conversations/' + c.id + '/messages').send({ body: 'intrusion' }))
      .status,
    403,
  );
  assert.equal(
    (await host.post('/api/conversations/' + c.id + '/messages').send({ body: '' })).status,
    400,
  );
  const body = '<script>alert(1)</script>';
  assert.equal(
    (await host.post('/api/conversations/' + c.id + '/messages').send({ body })).status,
    201,
  );
  assert.equal((await player.get('/api/conversations/' + c.id + '/messages')).body[0].body, body);
  assert.equal(
    (await player.get('/api/notifications')).body.some((n: any) => n.type === 'message'),
    true,
  );
});
test('only owners can edit profiles; people matching and distance filters use persisted preferences', async () => {
  const me = (await host.get('/api/users/' + hostId)).body;
  assert.equal((await player.put('/api/users/' + hostId).send(me)).status, 403);
  const updated = await host.put('/api/users/' + hostId).send({
    ...me,
    bio: 'Here to play.',
    favorite_sports: ['Basketball'],
    latitude: 14.55,
    longitude: 121.02,
    available_seats: 3,
    group_size: 5,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.bio, 'Here to play.');
  const list = await host.get('/api/people?sport=Basketball&age_min=20&age_max=40&seats=2');
  assert.equal(list.status, 200);
  assert.ok(list.body.every((p: any) => p.favorite_sports.includes('Basketball')));
  assert.equal((await player.get('/api/people?distance=10')).status, 400);
});
test('people and game search matches usernames and multiple terms, treats wildcards literally, and keeps private games hidden', async () => {
  const people = await player.get('/api/people').query({ q: '@HOST' });
  assert.equal(people.status, 200);
  assert.deepEqual(
    people.body.map((p: any) => p.id),
    [hostId],
  );
  assert.deepEqual(
    (await player.get('/api/people').query({ q: 'Basketball Host Makati' })).body.map(
      (p: any) => p.id,
    ),
    [hostId],
  );
  assert.deepEqual((await player.get('/api/people').query({ q: '%' })).body, []);
  assert.deepEqual((await player.get('/api/people').query({ q: '_' })).body, []);
  assert.deepEqual((await player.get('/api/people').query({ q: "' OR 1=1 --" })).body, []);
  assert.equal((await player.get('/api/people').query({ q: '@' })).status, 400);
  await player.post('/api/people/' + hostId + '/follow');
  assert.equal((await player.get('/api/people').query({ q: '@host' })).body[0].is_following, true);
  await player.delete('/api/people/' + hostId + '/follow');

  const publicGame = (
    await host.post('/api/events').send(game({ title: 'SearchLiteral_100% Watch' }))
  ).body;
  const privateGame = (
    await host
      .post('/api/events')
      .send(game({ title: 'SearchLiteral Private', privacy: 'Private' }))
  ).body;
  const cancelled = (
    await host.post('/api/events').send(game({ title: 'SearchLiteral Cancelled' }))
  ).body;
  await host.delete('/api/events/' + cancelled.id);
  const found = await player.get('/api/events').query({ q: 'SearchLiteral' });
  assert.equal(found.status, 200);
  assert.deepEqual(
    found.body.map((e: any) => e.id),
    [publicGame.id],
  );
  assert.ok(
    (await host.get('/api/events').query({ q: 'SearchLiteral' })).body.some(
      (e: any) => e.id === privateGame.id,
    ),
  );
  assert.deepEqual(
    (await request(app).get('/api/events').query({ q: 'SearchLiteral' })).body.map(
      (e: any) => e.id,
    ),
    [publicGame.id],
  );
  assert.deepEqual(
    (await player.get('/api/events').query({ q: '%' })).body.map((e: any) => e.id),
    [publicGame.id],
  );
  assert.deepEqual(
    (await player.get('/api/events').query({ q: '_' })).body.map((e: any) => e.id),
    [publicGame.id],
  );
  const near = await player.get('/api/events').query({ q: 'SearchLiteral Basketball near Manila' });
  assert.deepEqual(
    near.body.map((e: any) => e.id),
    [publicGame.id],
  );
  assert.deepEqual((await player.get('/api/events').query({ q: "' OR 1=1 --" })).body, []);
});

test('profile photos validate real image bytes, persist atomically, enforce ownership and replace safely', async () => {
  const before = (await host.get('/api/users/' + hostId)).body;
  const photo = await sharp({
    create: { width: 24, height: 16, channels: 3, background: '#ff642f' },
  })
    .png()
    .toBuffer();
  const endpoint = '/api/users/' + hostId;
  assert.equal(
    (
      await request(app)
        .put(endpoint)
        .field('profile', JSON.stringify(before))
        .attach('photo', photo, 'photo.png')
    ).status,
    401,
  );
  assert.equal(
    (
      await player
        .put(endpoint)
        .field('profile', JSON.stringify(before))
        .attach('photo', photo, 'photo.png')
    ).status,
    403,
  );
  assert.equal(
    (
      await host
        .put(endpoint)
        .field('profile', JSON.stringify(before))
        .attach('photo', Buffer.from('<svg onload="alert(1)"></svg>'), {
          filename: 'fake.png',
          contentType: 'image/png',
        })
    ).status,
    400,
  );
  assert.equal(
    (await host.put(endpoint).field('profile', 'not-json').attach('photo', photo, 'photo.png'))
      .status,
    400,
  );
  assert.equal(
    (
      await host
        .put(endpoint)
        .field('profile', JSON.stringify({ ...before, favorite_sports: ['Unknown'] }))
        .attach('photo', photo, 'photo.png')
    ).status,
    400,
  );
  assert.equal((await host.get(endpoint)).body.avatar_url, before.avatar_url);
  assert.equal(
    (
      await host
        .put(endpoint)
        .field('profile', JSON.stringify(before))
        .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 1), {
          filename: 'huge.png',
          contentType: 'image/png',
        })
    ).status,
    413,
  );
  const uploaded = await host
    .put(endpoint)
    .field('profile', JSON.stringify({ ...before, bio: 'A new photo, same crew.' }))
    .attach('photo', photo, 'photo.png');
  assert.equal(uploaded.status, 200, JSON.stringify(uploaded.body));
  const avatar = uploaded.body.avatar_url;
  assert.ok(avatar.startsWith('/api/uploads/avatars/' + hostId + '/'));
  const download = await request(app).get(avatar);
  assert.equal(download.status, 200);
  assert.match(download.headers['content-type'], /image\/webp/);
  assert.match(download.headers['x-content-type-options'], /nosniff/);
  const metadata = await sharp(download.body).metadata();
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.exif, undefined);
  assert.equal((await host.get('/api/auth/me')).body.avatar_url, avatar);
  const foreign = (await player.get('/api/users/' + playerId)).body;
  assert.equal(
    (await player.put('/api/users/' + playerId).send({ ...foreign, avatar_url: avatar })).status,
    400,
  );
  const { avatar_url: _url, ...detailsOnly } = uploaded.body;
  assert.equal(
    (await host.put(endpoint).send({ ...detailsOnly, bio: 'Photo stays when editing text.' })).body
      .avatar_url,
    avatar,
  );
  const replaced = await host
    .put(endpoint)
    .field('profile', JSON.stringify(uploaded.body))
    .attach('photo', photo, 'replacement.png');
  assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
  assert.notEqual(replaced.body.avatar_url, avatar);
  assert.equal((await request(app).get(avatar)).status, 404);
  const removed = await host.put(endpoint).send({ ...replaced.body, avatar_url: '' });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.avatar_url, null);
  assert.equal((await request(app).get(replaced.body.avatar_url)).status, 404);
});

test('admin profile saves without social preferences while ordinary users cannot bypass validation', async () => {
  const before = (await admin.get('/api/auth/me')).body;
  const endpoint = '/api/users/' + adminId;
  const photo = await sharp({
    create: { width: 64, height: 64, channels: 3, background: '#ff642f' },
  })
    .png()
    .toBuffer();
  const update = await admin
    .put(endpoint)
    .field(
      'profile',
      JSON.stringify({
        ...before,
        full_name: 'GORA Administrator',
        bio: 'Community moderation',
        location: '',
        favorite_sports: [],
        role: 'user',
      }),
    )
    .attach('photo', photo, 'admin.png');
  assert.equal(update.status, 200, JSON.stringify(update.body));
  assert.equal(update.body.full_name, 'GORA Administrator');
  assert.equal(update.body.bio, 'Community moderation');
  assert.equal(update.body.location, '');
  assert.deepEqual(update.body.favorite_sports, []);
  assert.equal(update.body.role, 'admin');
  assert.equal((await admin.get('/api/admin/dashboard')).status, 200);
  assert.equal((await request(app).get(update.body.avatar_url)).status, 200);
  const ordinary = (await host.get('/api/auth/me')).body;
  assert.equal(
    (
      await host
        .put('/api/users/' + hostId)
        .send({ ...ordinary, favorite_sports: [], role: 'admin' })
    ).status,
    400,
  );
  assert.equal(
    (await host.put('/api/users/' + hostId).send({ ...ordinary, location: '', role: 'admin' }))
      .status,
    400,
  );
  assert.equal((await host.put(endpoint).send(update.body)).status, 403);
  assert.equal(
    (await admin.put(endpoint).send({ ...update.body, favorite_sports: ['Unknown'] })).status,
    400,
  );
  const restore = await admin.put(endpoint).send(before);
  assert.equal(restore.status, 200);
  assert.equal((await request(app).get(update.body.avatar_url)).status, 404);
});

test('cancellation notifies participants, prevents joins and closes event messaging', async () => {
  const e = (await host.post('/api/events').send(game())).body;
  await player.post('/api/events/' + e.id + '/join');
  const c = (await player.get('/api/events/' + e.id)).body.conversation_id;
  assert.equal((await host.delete('/api/events/' + e.id)).status, 200);
  assert.equal((await other.post('/api/events/' + e.id + '/join')).status, 409);
  assert.equal(
    (await player.post('/api/conversations/' + c + '/messages').send({ body: 'hello' })).status,
    409,
  );
  assert.equal(
    (await player.get('/api/notifications')).body.some((n: any) => n.type === 'cancelled'),
    true,
  );
});
test('reports and admin moderation enforce roles and revoke suspended sessions', async () => {
  assert.equal((await host.get('/api/admin/dashboard')).status, 403);
  const r = await host
    .post('/api/reports')
    .send({ user_id: otherId, reason: 'Repeated no-shows.' });
  assert.equal(r.status, 201);
  const reports = await admin.get('/api/admin/reports');
  assert.equal(reports.status, 200);
  const report = reports.body[0];
  assert.equal(
    (
      await admin
        .put('/api/admin/reports/' + report.id)
        .send({ status: 'resolved', resolution: 'Reviewed and warned.' })
    ).status,
    200,
  );
  assert.equal((await admin.get('/api/admin/dashboard')).body.total_users, 4);
  assert.equal(
    (await admin.put('/api/admin/users/' + adminId).send({ status: 'banned' })).status,
    400,
  );
  assert.equal(
    (await admin.put('/api/admin/users/' + otherId).send({ status: 'suspended' })).status,
    200,
  );
  assert.equal((await other.get('/api/auth/me')).status, 401);
  assert.equal(
    (await admin.put('/api/admin/users/' + otherId).send({ status: 'active' })).status,
    200,
  );
  assert.equal((await other.get('/api/auth/me')).status, 401);
});
test('notifications can only be marked by their recipient', async () => {
  const notices = (await player.get('/api/notifications')).body;
  const n = notices[0];
  assert.ok(n);
  assert.equal((await host.put('/api/notifications/' + n.id + '/read')).status, 404);
  assert.equal((await player.put('/api/notifications/' + n.id + '/read')).status, 200);
});
test('reminders are generated once and cancellations do not duplicate notices', async () => {
  const e = (
    await host.post('/api/events').send(
      game({
        starts_at: new Date(Date.now() + 3600000).toISOString(),
        ends_at: new Date(Date.now() + 7200000).toISOString(),
      }),
    )
  ).body;
  await player.post('/api/events/' + e.id + '/join');
  await player.get('/api/notifications');
  await player.get('/api/notifications');
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND event_id=$2 AND type='reminder'",
        [playerId, e.id],
      )
    ).rows[0].count,
    1,
  );
  await host.delete('/api/events/' + e.id);
  await host.delete('/api/events/' + e.id);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND event_id=$2 AND type='cancelled'",
        [playerId, e.id],
      )
    ).rows[0].count,
    1,
  );
  assert.equal((await host.get('/api/events?offset=-1')).status, 400);
  assert.equal((await host.get('/api/people?limit=abc')).status, 400);
});
test('password reset tokens expire, are single use, and invalidate existing sessions', async () => {
  const r = await host.post('/api/auth/forgot-password').send({ email: 'host@test.example' });
  assert.equal(r.status, 200);
  const token = new URL(r.body.development_reset_link).searchParams.get('token');
  const newPassword = 'FreshGame2026!';
  assert.equal(
    (
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: newPassword, confirm_password: newPassword })
    ).status,
    200,
  );
  assert.equal((await host.get('/api/auth/me')).status, 401);
  assert.equal(
    (
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: newPassword, confirm_password: newPassword })
    ).status,
    400,
  );
  assert.equal(
    (await host.post('/api/auth/login').send({ email: 'host@test.example', password: newPassword }))
      .status,
    200,
  );
  const expired = 'a'.repeat(64);
  const { createHash } = await import('node:crypto');
  await db.query(
    "INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()-interval '1 hour')",
    [createHash('sha256').update(expired).digest('hex'), hostId],
  );
  assert.equal(
    (
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: expired, password: newPassword, confirm_password: newPassword })
    ).status,
    400,
  );
  await host.post('/api/auth/logout');
  assert.equal((await host.get('/api/auth/me')).status, 401);
});
