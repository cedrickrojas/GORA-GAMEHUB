import { Router } from 'express';
import { z } from 'zod';
import { db, transaction } from '../database/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap, text, id, url, HttpError, page } from '../utils/http.js';
import { notify } from '../services/notifications.js';
export const admin = Router();
admin.use(requireAuth, requireAdmin);
admin.get(
  '/dashboard',
  wrap(async (_req, res) => {
    res.json({
      ...(
        await db.query(
          `SELECT (SELECT count(*)::int FROM users) AS total_users,(SELECT count(*)::int FROM users WHERE status='active' AND last_active_at>now()-interval '30 days') AS active_users,(SELECT count(*)::int FROM events) AS total_events,(SELECT count(*)::int FROM events WHERE starts_at>now() AND status='active') AS upcoming_events,(SELECT count(*)::int FROM reports WHERE status='open') AS reports`,
        )
      ).rows[0],
      popular_sports: (
        await db.query(
          'SELECT s.name,count(e.id)::int AS events FROM sports s LEFT JOIN events e ON e.sport_id=s.id GROUP BY s.id ORDER BY events DESC',
        )
      ).rows,
    });
  }),
);
admin.get(
  '/users',
  wrap(async (req, res) => {
    const { limit, offset } = page(req);
    res.json(
      (
        await db.query(
          'SELECT u.id,u.email,u.username,u.full_name,u.role,u.status,u.created_at,p.avatar_url FROM users u JOIN profiles p ON p.user_id=u.id ORDER BY u.created_at DESC LIMIT $1 OFFSET $2',
          [limit, offset],
        )
      ).rows,
    );
  }),
);
admin.put(
  '/users/:id',
  wrap(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['active', 'suspended', 'banned']) })
      .parse(req.body);
    if (id(req) === req.user!.id)
      throw new HttpError(400, 'You cannot change your own account status.');
    const r = await db.query(
      'UPDATE users SET status=$1,token_version=token_version+1 WHERE id=$2 RETURNING id',
      [status, id(req)],
    );
    if (!r.rows.length) throw new HttpError(404, 'User not found.');
    res.json({ success: true });
  }),
);
admin.get(
  '/events',
  wrap(async (req, res) => {
    const { limit, offset } = page(req);
    res.json(
      (
        await db.query(
          'SELECT e.*,u.full_name AS host_name,s.name AS sport FROM events e JOIN users u ON u.id=e.host_id JOIN sports s ON s.id=e.sport_id ORDER BY e.created_at DESC LIMIT $1 OFFSET $2',
          [limit, offset],
        )
      ).rows,
    );
  }),
);
admin.delete(
  '/events/:id',
  wrap(async (req, res) => {
    const r = await db.query('DELETE FROM events WHERE id=$1 RETURNING id', [id(req)]);
    if (!r.rows.length) throw new HttpError(404, 'Event not found.');
    res.json({ success: true });
  }),
);
const sportFields = z.object({
  name: text(40),
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  icon: text(40),
  description: text(500),
  image_url: url,
});
admin.post(
  '/sports',
  wrap(async (req, res) => {
    const v = sportFields.parse(req.body);
    res
      .status(201)
      .json(
        (
          await db.query(
            'INSERT INTO sports(name,slug,icon,description,image_url) VALUES($1,$2,$3,$4,$5) RETURNING *',
            [v.name, v.slug, v.icon, v.description, v.image_url],
          )
        ).rows[0],
      );
  }),
);
admin.put(
  '/sports/:id',
  wrap(async (req, res) => {
    const v = sportFields.parse(req.body);
    const r = await db.query(
      'UPDATE sports SET name=$1,slug=$2,icon=$3,description=$4,image_url=$5 WHERE id=$6 RETURNING *',
      [v.name, v.slug, v.icon, v.description, v.image_url, id(req)],
    );
    if (!r.rows.length) throw new HttpError(404, 'Sport not found.');
    res.json(r.rows[0]);
  }),
);
admin.get(
  '/reports',
  wrap(async (_req, res) =>
    res.json(
      (
        await db.query(
          'SELECT r.*,u.full_name AS reporter_name FROM reports r JOIN users u ON u.id=r.reporter_id ORDER BY r.created_at DESC LIMIT 100',
        )
      ).rows,
    ),
  ),
);
admin.put(
  '/reports/:id',
  wrap(async (req, res) => {
    const v = z
      .object({ status: z.enum(['resolved', 'dismissed']), resolution: text(1000) })
      .parse(req.body);
    const r = await db.query('UPDATE reports SET status=$1,resolution=$2 WHERE id=$3 RETURNING *', [
      v.status,
      v.resolution,
      id(req),
    ]);
    if (!r.rows.length) throw new HttpError(404, 'Report not found.');
    res.json(r.rows[0]);
  }),
);
admin.delete(
  '/messages/:id',
  wrap(async (req, res) => {
    await db.query('DELETE FROM messages WHERE id=$1', [id(req)]);
    res.json({ success: true });
  }),
);
admin.post(
  '/notifications',
  wrap(async (req, res) => {
    const { title } = z.object({ title: text(200) }).parse(req.body);
    await transaction(async (tx) => {
      for (const u of (await tx.query("SELECT id FROM users WHERE status='active'")).rows)
        await notify(u.id, req.user!.id, 'announcement', title, '/notifications', null, tx);
    });
    res.json({ success: true });
  }),
);
admin.get(
  '/settings',
  wrap(async (_req, res) =>
    res.json((await db.query('SELECT * FROM system_settings ORDER BY key')).rows),
  ),
);
admin.put(
  '/settings',
  wrap(async (req, res) => {
    const v = z
      .object({ key: z.enum(['maintenance_banner', 'community_guidelines']), value: text(2000) })
      .parse(req.body);
    await db.query(
      'INSERT INTO system_settings(key,value) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()',
      [v.key, JSON.stringify(v.value)],
    );
    res.json({ success: true });
  }),
);
