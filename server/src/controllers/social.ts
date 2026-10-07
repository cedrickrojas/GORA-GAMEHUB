import { Router } from 'express';
import { z } from 'zod';
import { db, transaction } from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import { profileSelect, eventSelect, visibility } from '../models/queries.js';
import { wrap, text, uuid, id, url, page, HttpError } from '../utils/http.js';
import { notify, reminders } from '../services/notifications.js';
export const social = Router();
social.get(
  '/sports',
  wrap(async (_req, res) =>
    res.json(
      (
        await db.query(
          `SELECT s.*,(SELECT count(*)::int FROM events e WHERE e.sport_id=s.id AND e.status='active' AND e.ends_at>now()) AS active_games,(SELECT count(*)::int FROM communities c WHERE c.sport_id=s.id) AS active_communities FROM sports s ORDER BY CASE s.name WHEN 'Basketball' THEN 0 WHEN 'Football' THEN 1 WHEN 'Volleyball' THEN 2 WHEN 'Tennis' THEN 3 WHEN 'Badminton' THEN 4 ELSE 5 END,s.name`,
        )
      ).rows,
    ),
  ),
);
social.get(
  '/sports/:id',
  wrap(async (req, res) => {
    const s = (await db.query('SELECT * FROM sports WHERE id=$1', [id(req)])).rows[0];
    if (!s) throw new HttpError(404, 'Sport not found.');
    res.json(s);
  }),
);
social.get(
  ['/people', '/users'],
  wrap(async (req, res) => {
    const { limit, offset } = page(req);
    const v: any[] = [req.user?.id || null];
    let where = " WHERE u.status='active' AND u.id IS DISTINCT FROM $1";
    const add = (sql: string, value: any) => {
      v.push(value);
      where += ' AND ' + sql.replace('?', `$${v.length}`);
    };
    if (req.query.q)
      add(
        "(u.full_name || ' ' || u.username || ' ' || p.location) ILIKE ?",
        '%' + text(120).parse(req.query.q) + '%',
      );
    if (req.query.sport)
      add(
        'EXISTS(SELECT 1 FROM user_sports us JOIN sports s ON s.id=us.sport_id WHERE us.user_id=u.id AND s.name=?)',
        text(40).parse(req.query.sport),
      );
    if (req.query.location)
      add('p.location ILIKE ?', '%' + text(120).parse(req.query.location) + '%');
    if (req.query.team) add('p.favorite_team ILIKE ?', '%' + text(80).parse(req.query.team) + '%');
    for (const [key, expr] of [
      ['age_min', 'EXTRACT(YEAR FROM age(u.date_of_birth)) >= ?'],
      ['age_max', 'EXTRACT(YEAR FROM age(u.date_of_birth)) <= ?'],
      ['seats', 'p.available_seats >= ?'],
      ['group_size', 'p.group_size <= ?'],
    ] as const)
      if (req.query[key]) add(expr, z.coerce.number().int().min(0).max(120).parse(req.query[key]));
    if (req.query.event_id)
      add(
        "EXISTS(SELECT 1 FROM event_participants ep JOIN events e ON e.id=ep.event_id WHERE ep.user_id=u.id AND e.id=? AND e.privacy='Public' AND ep.status='approved')",
        uuid.parse(req.query.event_id),
      );
    if (req.query.date)
      add(
        "EXISTS(SELECT 1 FROM event_participants ep JOIN events e ON e.id=ep.event_id WHERE ep.user_id=u.id AND e.type='Watch a Game' AND e.privacy='Public' AND (e.starts_at AT TIME ZONE 'Asia/Manila')::date=?::date)",
        z.iso.date().parse(req.query.date),
      );
    if (req.query.time)
      add(
        "EXISTS(SELECT 1 FROM event_participants ep JOIN events e ON e.id=ep.event_id WHERE ep.user_id=u.id AND e.type='Watch a Game' AND e.privacy='Public' AND (e.starts_at AT TIME ZONE 'Asia/Manila')::time>=?::time)",
        z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .parse(req.query.time),
      );
    let distance = 'NULL::double precision';
    if (req.query.distance) {
      const dist = z.coerce.number().positive().max(1000).parse(req.query.distance);
      const me = (
        await db.query('SELECT latitude,longitude FROM profiles WHERE user_id=$1', [
          req.user?.id || null,
        ])
      ).rows[0];
      if (me?.latitude == null || me.longitude == null)
        throw new HttpError(
          400,
          'Set your latitude and longitude in profile settings to use distance.',
        );
      v.push(me.latitude, me.longitude);
      distance = `6371*acos(LEAST(1.0,GREATEST(-1.0,sin(radians($${v.length - 1}::double precision))*sin(radians(p.latitude))+cos(radians($${v.length - 1}::double precision))*cos(radians(p.latitude))*cos(radians(p.longitude-$${v.length}::double precision)))))`;
      add(`${distance} <= ?`, dist);
    }
    const select = profileSelect.replace(
      ' FROM users u',
      `,EXISTS(SELECT 1 FROM followers f WHERE f.follower_id=$1 AND f.following_id=u.id) AS is_following,
 (SELECT f.status FROM friendships f WHERE (f.requester_id=$1 AND f.addressee_id=u.id) OR (f.addressee_id=$1 AND f.requester_id=u.id)) AS friendship_status,
 ${distance} AS distance_km,
 CASE WHEN $1::uuid IS NULL THEN NULL ELSE LEAST(99,50+10*(SELECT count(*)::int FROM user_sports us WHERE us.user_id=u.id AND us.sport_id IN(SELECT sport_id FROM user_sports WHERE user_id=$1))+CASE WHEN p.location=(SELECT location FROM profiles WHERE user_id=$1) THEN 20 ELSE 0 END) END AS match_percentage FROM users u`,
    );
    v.push(limit, offset);
    res.json(
      (
        await db.query(
          select +
            where +
            ` ORDER BY match_percentage DESC NULLS LAST,u.full_name LIMIT $${v.length - 1} OFFSET $${v.length}`,
          v,
        )
      ).rows,
    );
  }),
);
social.get(
  '/users/:id/events',
  wrap(async (req, res) => {
    res.json(
      (
        await db.query(
          eventSelect +
            ` WHERE ${visibility} AND (e.host_id=$2 OR EXISTS(SELECT 1 FROM event_participants ep WHERE ep.event_id=e.id AND ep.user_id=$2 AND ep.status='approved')) ORDER BY e.starts_at DESC LIMIT 100`,
          [req.user?.id || null, id(req)],
        )
      ).rows,
    );
  }),
);
social.get(
  '/users/:id',
  wrap(async (req, res) => {
    const u = (
      await db.query(profileSelect + ' WHERE u.id=$1 AND u.status=$2', [id(req), 'active'])
    ).rows[0];
    if (!u) throw new HttpError(404, 'Profile not found.');
    u.is_following = !!(
      await db.query('SELECT 1 FROM followers WHERE follower_id=$1 AND following_id=$2', [
        req.user?.id || null,
        u.id,
      ])
    ).rows.length;
    const f = (
      await db.query(
        'SELECT * FROM friendships WHERE(requester_id=$1 AND addressee_id=$2) OR(requester_id=$2 AND addressee_id=$1)',
        [req.user?.id || null, u.id],
      )
    ).rows[0];
    u.friendship_status = f?.status || null;
    u.friendship_incoming = f?.addressee_id === req.user?.id;
    res.json(u);
  }),
);
social.put(
  '/users/:id',
  requireAuth,
  wrap(async (req, res) => {
    const user = id(req);
    if (user !== req.user!.id) throw new HttpError(403, 'You can edit only your own profile.');
    const v = z
      .object({
        full_name: text(80),
        bio: z.string().trim().max(500),
        location: text(120),
        avatar_url: url.or(z.literal('')).nullable().optional(),
        favorite_team: z.string().trim().max(80),
        favorite_sports: z.array(text(40)).min(1).max(13),
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
        available_seats: z.number().int().min(0).max(100),
        group_size: z.number().int().min(1).max(100),
      })
      .parse(req.body);
    await transaction(async (tx) => {
      await tx.query('UPDATE users SET full_name=$1 WHERE id=$2', [v.full_name, user]);
      await tx.query(
        'UPDATE profiles SET bio=$1,location=$2,avatar_url=$3,favorite_team=$4,latitude=$5,longitude=$6,available_seats=$7,group_size=$8 WHERE user_id=$9',
        [
          v.bio,
          v.location,
          v.avatar_url || null,
          v.favorite_team,
          v.latitude ?? null,
          v.longitude ?? null,
          v.available_seats,
          v.group_size,
          user,
        ],
      );
      const sports = (
        await tx.query('SELECT id FROM sports WHERE name=ANY($1::text[])', [v.favorite_sports])
      ).rows;
      if (sports.length !== new Set(v.favorite_sports).size)
        throw new HttpError(400, 'Select valid sports.');
      await tx.query('DELETE FROM user_sports WHERE user_id=$1', [user]);
      for (const s of sports)
        await tx.query('INSERT INTO user_sports(user_id,sport_id) VALUES($1,$2)', [user, s.id]);
    });
    res.json((await db.query(profileSelect + ' WHERE u.id=$1', [user])).rows[0]);
  }),
);
social.delete(
  '/users/:id',
  requireAuth,
  wrap(async (req, res) => {
    if (id(req) !== req.user!.id) throw new HttpError(403, 'You can delete only your own account.');
    const { password } = z.object({ password: z.string().min(1).max(72) }).parse(req.body);
    const bcrypt = await import('bcrypt');
    const u = (await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user!.id]))
      .rows[0];
    if (!(await bcrypt.compare(password, u.password_hash)))
      throw new HttpError(403, 'Password is incorrect.');
    await db.query('DELETE FROM users WHERE id=$1', [req.user!.id]);
    res.clearCookie('gora_session', { path: '/' });
    res.json({ success: true });
  }),
);
social.post(
  '/people/:id/follow',
  requireAuth,
  wrap(async (req, res) => {
    const target = id(req);
    if (target === req.user!.id) throw new HttpError(400, 'You cannot follow yourself.');
    await transaction(async (tx) => {
      const r = await tx.query(
        'INSERT INTO followers(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING following_id',
        [req.user!.id, target],
      );
      if (r.rows.length)
        await notify(
          target,
          req.user!.id,
          'follower',
          req.user!.full_name + ' started following you',
          '/user/' + req.user!.id,
          null,
          tx,
        );
    });
    res.json({ success: true });
  }),
);
social.delete(
  '/people/:id/follow',
  requireAuth,
  wrap(async (req, res) => {
    await db.query('DELETE FROM followers WHERE follower_id=$1 AND following_id=$2', [
      req.user!.id,
      id(req),
    ]);
    res.json({ success: true });
  }),
);
social.get(
  '/users/:id/connections',
  wrap(async (req, res) => {
    const kind = z.enum(['followers', 'following', 'friends']).parse(req.query.kind || 'followers');
    const user = id(req);
    const query =
      kind === 'friends'
        ? `u.id IN(SELECT CASE WHEN requester_id=$1 THEN addressee_id ELSE requester_id END FROM friendships WHERE (requester_id=$1 OR addressee_id=$1) AND status='accepted')`
        : `u.id IN(SELECT ${kind === 'followers' ? 'follower_id' : 'following_id'} FROM followers WHERE ${kind === 'followers' ? 'following_id' : 'follower_id'}=$1)`;
    res.json(
      (
        await db.query(profileSelect + " WHERE u.status='active' AND " + query + ' LIMIT 100', [
          user,
        ])
      ).rows,
    );
  }),
);
social.get(
  '/friends',
  requireAuth,
  wrap(async (req, res) => {
    res.json(
      (
        await db.query(
          `SELECT f.*,u.id,u.full_name,u.username,p.avatar_url FROM friendships f JOIN users u ON u.id=CASE WHEN f.requester_id=$1 THEN f.addressee_id ELSE f.requester_id END JOIN profiles p ON p.user_id=u.id WHERE f.requester_id=$1 OR f.addressee_id=$1 ORDER BY f.created_at DESC`,
          [req.user!.id],
        )
      ).rows,
    );
  }),
);
social.post(
  '/friends/:id/request',
  requireAuth,
  wrap(async (req, res) => {
    const target = id(req);
    if (target === req.user!.id) throw new HttpError(400, 'You cannot friend yourself.');
    await transaction(async (tx) => {
      await tx.query('INSERT INTO friendships(requester_id,addressee_id) VALUES($1,$2)', [
        req.user!.id,
        target,
      ]);
      await notify(
        target,
        req.user!.id,
        'friend_request',
        req.user!.full_name + ' sent you a friend request',
        '/user/' + req.user!.id,
        null,
        tx,
      );
    });
    res.status(201).json({ success: true });
  }),
);
social.post(
  '/friends/:id/accept',
  requireAuth,
  wrap(async (req, res) => {
    const r = await db.query(
      "UPDATE friendships SET status='accepted' WHERE requester_id=$1 AND addressee_id=$2 AND status='pending' RETURNING requester_id",
      [id(req), req.user!.id],
    );
    if (!r.rows.length) throw new HttpError(404, 'Request not found.');
    await notify(
      id(req),
      req.user!.id,
      'friend_accepted',
      req.user!.full_name + ' accepted your request',
      '/user/' + req.user!.id,
    );
    res.json({ success: true });
  }),
);
social.delete(
  '/friends/:id',
  requireAuth,
  wrap(async (req, res) => {
    await db.query(
      'DELETE FROM friendships WHERE(requester_id=$1 AND addressee_id=$2) OR(requester_id=$2 AND addressee_id=$1)',
      [req.user!.id, id(req)],
    );
    res.json({ success: true });
  }),
);
social.get(
  '/communities',
  wrap(async (_req, res) =>
    res.json(
      (
        await db.query(
          `SELECT c.*,s.name AS sport,(SELECT count(*)::int FROM community_members m WHERE m.community_id=c.id) AS members FROM communities c JOIN sports s ON s.id=c.sport_id ORDER BY members DESC`,
        )
      ).rows,
    ),
  ),
);
social.post(
  '/communities/:id/join',
  requireAuth,
  wrap(async (req, res) => {
    await db.query(
      'INSERT INTO community_members(community_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [id(req), req.user!.id],
    );
    res.json({ success: true });
  }),
);
social.delete(
  '/communities/:id/leave',
  requireAuth,
  wrap(async (req, res) => {
    await db.query('DELETE FROM community_members WHERE community_id=$1 AND user_id=$2', [
      id(req),
      req.user!.id,
    ]);
    res.json({ success: true });
  }),
);
social.get(
  '/communities/:id',
  wrap(async (req, res) => {
    const c = (
      await db.query(
        `SELECT c.*,s.name AS sport,EXISTS(SELECT 1 FROM community_members m WHERE m.community_id=c.id AND m.user_id=$2) AS joined FROM communities c JOIN sports s ON s.id=c.sport_id WHERE c.id=$1`,
        [id(req), req.user?.id || null],
      )
    ).rows[0];
    if (!c) throw new HttpError(404, 'Community not found.');
    c.members = (
      await db.query(
        profileSelect +
          " WHERE u.status='active' AND u.id IN(SELECT user_id FROM community_members WHERE community_id=$1)",
        [c.id],
      )
    ).rows;
    res.json(c);
  }),
);
social.get(
  '/notifications',
  requireAuth,
  wrap(async (req, res) => {
    await reminders();
    const { limit, offset } = page(req);
    res.json(
      (
        await db.query(
          'SELECT n.*,p.avatar_url FROM notifications n LEFT JOIN profiles p ON p.user_id=n.actor_id WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT $2 OFFSET $3',
          [req.user!.id, limit, offset],
        )
      ).rows,
    );
  }),
);
social.put(
  '/notifications/:id/read',
  requireAuth,
  wrap(async (req, res) => {
    const r = await db.query(
      'UPDATE notifications SET read_at=now() WHERE id=$1 AND user_id=$2 RETURNING id',
      [id(req), req.user!.id],
    );
    if (!r.rows.length) throw new HttpError(404, 'Notification not found.');
    res.json({ success: true });
  }),
);
social.post(
  '/reports',
  requireAuth,
  wrap(async (req, res) => {
    const v = z
      .object({
        user_id: uuid.optional(),
        event_id: uuid.optional(),
        message_id: uuid.optional(),
        reason: text(1000),
      })
      .refine(
        (v) => [v.user_id, v.event_id, v.message_id].filter(Boolean).length === 1,
        'Select one report target.',
      )
      .parse(req.body);
    await db.query(
      'INSERT INTO reports(reporter_id,user_id,event_id,message_id,reason) VALUES($1,$2,$3,$4,$5)',
      [req.user!.id, v.user_id || null, v.event_id || null, v.message_id || null, v.reason],
    );
    res.status(201).json({ success: true });
  }),
);
