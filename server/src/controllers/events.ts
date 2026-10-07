import { Router } from 'express';
import { z } from 'zod';
import { db, transaction } from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import { eventSelect, visibility } from '../models/queries.js';
import { wrap, text, uuid, id, url, HttpError, page } from '../utils/http.js';
import { notify } from '../services/notifications.js';
export const events = Router();
const fields = z
  .object({
    title: text(120),
    sport_id: uuid,
    description: z.string().trim().max(3000).default(''),
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
    location: text(120),
    venue: text(160),
    max_participants: z.number().int().min(2).max(500),
    required_participants: z.number().int().min(1).max(500).default(2),
    type: z.enum(['Watch a Game', 'Play a Game', 'Practice', 'Tournament', 'Casual Match']),
    skill_level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Any']),
    privacy: z.enum(['Public', 'Friends', 'Private']),
    image_url: url.optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    message: 'End time must follow start time.',
  })
  .refine((v) => v.required_participants <= v.max_participants, {
    message: 'Required participants cannot exceed capacity.',
  });
events.get(
  '/',
  wrap(async (req, res) => {
    const user = req.user?.id || null;
    const { limit, offset } = page(req);
    const vals: any[] = [user];
    let where = ` WHERE ${visibility}`;
    const add = (sql: string, v: any) => {
      vals.push(v);
      where += ` AND ${sql.replace('?', `$${vals.length}`)}`;
    };
    if (req.query.scope === 'mine') {
      if (!user) throw new HttpError(401, 'Sign in to see your schedule.');
      add(
        '(e.host_id=? OR EXISTS(SELECT 1 FROM event_participants ep WHERE ep.event_id=e.id AND ep.user_id=$1))',
        user,
      );
    } else if (req.query.scope !== 'all') where += " AND e.status='active' AND e.ends_at>now()";
    if (req.query.q) {
      const q = text(120)
        .parse(req.query.q)
        .replace(/\s+near\s+/i, ' ');
      for (const token of q.split(/\s+/).filter(Boolean).slice(0, 6))
        add(
          "(e.title || ' ' || e.location || ' ' || s.name || ' ' || e.venue) ILIKE ?",
          `%${token}%`,
        );
    }
    if (req.query.sport) add('s.name=?', text(40).parse(req.query.sport));
    if (req.query.type) add('e.type=?', text(40).parse(req.query.type));
    if (req.query.location) add('e.location ILIKE ?', `%${text(120).parse(req.query.location)}%`);
    if (req.query.date)
      add(
        "(e.starts_at AT TIME ZONE 'Asia/Manila')::date=?::date",
        z.iso.date().parse(req.query.date),
      );
    vals.push(limit, offset);
    const select = eventSelect.replace(
      ' FROM events e',
      `,(SELECT ep.status FROM event_participants ep WHERE ep.event_id=e.id AND ep.user_id=$1) AS joined_status FROM events e`,
    );
    const r = await db.query(
      select + where + ` ORDER BY e.starts_at LIMIT $${vals.length - 1} OFFSET $${vals.length}`,
      vals,
    );
    res.json(r.rows);
  }),
);
// Extra calculated fields are placed before FROM rather than after the join clause.
async function eventFor(eventId: string, userId: string | null) {
  const r = await db.query(eventSelect + ` WHERE e.id=$2 AND ${visibility}`, [userId, eventId]);
  if (!r.rows[0]) throw new HttpError(404, 'Game not found or access is restricted.');
  return r.rows[0];
}
events.get(
  '/:id',
  wrap(async (req, res) => {
    const e = await eventFor(id(req), req.user?.id || null);
    e.participant_list = (
      await db.query(
        `SELECT u.id,u.full_name,u.username,p.avatar_url,ep.status FROM event_participants ep JOIN users u ON u.id=ep.user_id JOIN profiles p ON p.user_id=u.id WHERE ep.event_id=$1 AND (ep.status='approved' OR $2::uuid=$3::uuid OR ep.user_id=$2::uuid) ORDER BY ep.created_at`,
        [e.id, req.user?.id || null, e.host_id],
      )
    ).rows;
    e.joined_status =
      (
        await db.query('SELECT status FROM event_participants WHERE event_id=$1 AND user_id=$2', [
          e.id,
          req.user?.id || null,
        ])
      ).rows[0]?.status || null;
    e.conversation_id =
      (
        await db.query(
          'SELECT c.id FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id WHERE c.event_id=$1 AND cm.user_id=$2',
          [e.id, req.user?.id || null],
        )
      ).rows[0]?.id || null;
    res.json(e);
  }),
);
events.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const v = fields.parse(req.body);
    if (new Date(v.starts_at).getTime() < Date.now() - 60000)
      throw new HttpError(400, 'Choose a future date.');
    const e = await transaction(async (tx) => {
      const sport = (await tx.query('SELECT * FROM sports WHERE id=$1', [v.sport_id])).rows[0];
      if (!sport) throw new HttpError(400, 'Select a valid sport.');
      const venue = (
        await tx.query(
          'INSERT INTO venues(name,location) VALUES($1,$2) ON CONFLICT(name,location) DO UPDATE SET name=EXCLUDED.name RETURNING id',
          [v.venue, v.location],
        )
      ).rows[0];
      const e = (
        await tx.query(
          `INSERT INTO events(host_id,sport_id,venue_id,title,description,starts_at,ends_at,location,venue,max_participants,required_participants,type,skill_level,privacy,image_url,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
          [
            req.user!.id,
            v.sport_id,
            venue.id,
            v.title,
            v.description,
            v.starts_at,
            v.ends_at,
            v.location,
            v.venue,
            v.max_participants,
            v.required_participants,
            v.type,
            v.skill_level,
            v.privacy,
            v.image_url || sport.image_url,
            v.latitude ?? null,
            v.longitude ?? null,
          ],
        )
      ).rows[0];
      await tx.query('INSERT INTO event_participants(event_id,user_id) VALUES($1,$2)', [
        e.id,
        req.user!.id,
      ]);
      const c = (
        await tx.query('INSERT INTO conversations(event_id,title) VALUES($1,$2) RETURNING id', [
          e.id,
          'GORA ' + sport.name + ' — ' + e.title,
        ])
      ).rows[0];
      await tx.query('INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2)', [
        c.id,
        req.user!.id,
      ]);
      return e;
    });
    res.status(201).json(e);
  }),
);
events.put(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const v = fields.parse(req.body);
    const e = await transaction(async (tx) => {
      const e = (await tx.query('SELECT * FROM events WHERE id=$1 FOR UPDATE', [id(req)])).rows[0];
      if (!e) throw new HttpError(404, 'Game not found.');
      if (e.host_id !== req.user!.id) throw new HttpError(403, 'Only the host can edit this game.');
      if (e.status === 'cancelled') throw new HttpError(409, 'This game is cancelled.');
      const count = (
        await tx.query(
          "SELECT count(*)::int AS count FROM event_participants WHERE event_id=$1 AND status='approved'",
          [e.id],
        )
      ).rows[0].count;
      if (v.max_participants < count)
        throw new HttpError(409, 'Capacity cannot be lower than the number of participants.');
      const sport = (await tx.query('SELECT image_url FROM sports WHERE id=$1', [v.sport_id]))
        .rows[0];
      if (!sport) throw new HttpError(400, 'Select a valid sport.');
      const changed = (
        await tx.query(
          'UPDATE events SET title=$1,sport_id=$2,description=$3,starts_at=$4,ends_at=$5,location=$6,venue=$7,max_participants=$8,required_participants=$9,type=$10,skill_level=$11,privacy=$12,image_url=$13 WHERE id=$14 RETURNING *',
          [
            v.title,
            v.sport_id,
            v.description,
            v.starts_at,
            v.ends_at,
            v.location,
            v.venue,
            v.max_participants,
            v.required_participants,
            v.type,
            v.skill_level,
            v.privacy,
            v.image_url || sport.image_url,
            e.id,
          ],
        )
      ).rows[0];
      await tx.query('UPDATE conversations SET title=$1 WHERE event_id=$2', [
        'GORA ' + v.title,
        e.id,
      ]);
      const members = (
        await tx.query('SELECT user_id FROM event_participants WHERE event_id=$1', [e.id])
      ).rows;
      for (const p of members)
        await notify(
          p.user_id,
          req.user!.id,
          'updated',
          v.title + ' was updated',
          '/event/' + e.id,
          e.id,
          tx,
        );
      return changed;
    });
    res.json(e);
  }),
);
events.delete(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    await transaction(async (tx) => {
      const e = (await tx.query('SELECT * FROM events WHERE id=$1 FOR UPDATE', [id(req)])).rows[0];
      if (!e) throw new HttpError(404, 'Game not found.');
      if (e.host_id !== req.user!.id && req.user!.role !== 'admin')
        throw new HttpError(403, 'Only the host can cancel this game.');
      if (e.status === 'cancelled') return;
      await tx.query("UPDATE events SET status='cancelled' WHERE id=$1", [e.id]);
      for (const p of (
        await tx.query('SELECT user_id FROM event_participants WHERE event_id=$1', [e.id])
      ).rows)
        await notify(
          p.user_id,
          req.user!.id,
          'cancelled',
          e.title + ' was cancelled',
          '/event/' + e.id,
          e.id,
          tx,
        );
    });
    res.json({ success: true });
  }),
);
events.post(
  '/:id/join',
  requireAuth,
  wrap(async (req, res) => {
    const result = await transaction(async (tx) => {
      const e = (await tx.query('SELECT * FROM events WHERE id=$1 FOR UPDATE', [id(req)])).rows[0];
      if (!e) throw new HttpError(404, 'Game not found.');
      if (e.status !== 'active' || new Date(e.ends_at) < new Date())
        throw new HttpError(409, 'This game is no longer available.');
      const existing = (
        await tx.query('SELECT status FROM event_participants WHERE event_id=$1 AND user_id=$2', [
          e.id,
          req.user!.id,
        ])
      ).rows[0];
      if (existing) return existing;
      const invitation = (
        await tx.query(
          "SELECT 1 FROM event_invitations WHERE event_id=$1 AND invitee_id=$2 AND status<>'declined'",
          [e.id, req.user!.id],
        )
      ).rows.length;
      const friend = (
        await tx.query(
          "SELECT 1 FROM friendships WHERE status='accepted' AND ((requester_id=$1 AND addressee_id=$2) OR(requester_id=$2 AND addressee_id=$1))",
          [e.host_id, req.user!.id],
        )
      ).rows.length;
      if (e.privacy === 'Friends' && !friend && !invitation)
        throw new HttpError(403, 'This game is for friends of the host.');
      const count = (
        await tx.query(
          "SELECT count(*)::int AS count FROM event_participants WHERE event_id=$1 AND status='approved'",
          [e.id],
        )
      ).rows[0].count;
      if (count >= e.max_participants) throw new HttpError(409, 'This game is full.');
      if (e.privacy === 'Private' && !invitation)
        throw new HttpError(403, 'This private game requires an invitation.');
      const status = e.privacy === 'Private' ? 'pending' : 'approved';
      await tx.query('INSERT INTO event_participants(event_id,user_id,status) VALUES($1,$2,$3)', [
        e.id,
        req.user!.id,
        status,
      ]);
      if (status === 'approved')
        await tx.query(
          'INSERT INTO conversation_members(conversation_id,user_id) SELECT id,$1 FROM conversations WHERE event_id=$2 ON CONFLICT DO NOTHING',
          [req.user!.id, e.id],
        );
      await tx.query(
        "UPDATE event_invitations SET status='accepted' WHERE event_id=$1 AND invitee_id=$2",
        [e.id, req.user!.id],
      );
      await notify(
        e.host_id,
        req.user!.id,
        'join',
        req.user!.full_name + (status === 'pending' ? ' requested to join ' : ' joined ') + e.title,
        '/event/' + e.id,
        e.id,
        tx,
      );
      return { status };
    });
    res.json(result);
  }),
);
events.delete(
  '/:id/leave',
  requireAuth,
  wrap(async (req, res) => {
    await transaction(async (tx) => {
      const e = (await tx.query('SELECT * FROM events WHERE id=$1 FOR UPDATE', [id(req)])).rows[0];
      if (!e) throw new HttpError(404, 'Game not found.');
      if (e.host_id === req.user!.id)
        throw new HttpError(409, 'Hosts must cancel the game instead of leaving.');
      const removed = await tx.query(
        'DELETE FROM event_participants WHERE event_id=$1 AND user_id=$2 RETURNING user_id',
        [e.id, req.user!.id],
      );
      if (!removed.rows.length) return;
      await tx.query(
        'DELETE FROM conversation_members WHERE user_id=$1 AND conversation_id IN(SELECT id FROM conversations WHERE event_id=$2)',
        [req.user!.id, e.id],
      );
      await notify(
        e.host_id,
        req.user!.id,
        'leave',
        req.user!.full_name + ' left ' + e.title,
        '/event/' + e.id,
        e.id,
        tx,
      );
    });
    res.json({ success: true });
  }),
);
events.post(
  '/:id/invite',
  requireAuth,
  wrap(async (req, res) => {
    const { user_id } = z.object({ user_id: uuid }).parse(req.body);
    const e = await eventFor(id(req), req.user!.id);
    if (
      e.host_id !== req.user!.id &&
      !(
        await db.query(
          "SELECT 1 FROM event_participants WHERE event_id=$1 AND user_id=$2 AND status='approved'",
          [e.id, req.user!.id],
        )
      ).rows.length
    )
      throw new HttpError(403, 'Join this game before inviting someone.');
    await transaction(async (tx) => {
      await tx.query(
        "INSERT INTO event_invitations(event_id,inviter_id,invitee_id) VALUES($1,$2,$3) ON CONFLICT(event_id,invitee_id) DO UPDATE SET status='pending',inviter_id=EXCLUDED.inviter_id",
        [e.id, req.user!.id, user_id],
      );
      await notify(
        user_id,
        req.user!.id,
        'invitation',
        req.user!.full_name + ' invited you to ' + e.title,
        '/event/' + e.id,
        e.id,
        tx,
      );
    });
    res.status(201).json({ success: true });
  }),
);
events.put(
  '/:id/participants/:userId',
  requireAuth,
  wrap(async (req, res) => {
    const { action } = z.object({ action: z.enum(['approve', 'remove']) }).parse(req.body);
    const target = id(req, 'userId');
    await transaction(async (tx) => {
      const e = (await tx.query('SELECT * FROM events WHERE id=$1 FOR UPDATE', [id(req)])).rows[0];
      if (!e || e.host_id !== req.user!.id)
        throw new HttpError(403, 'Only the host can manage participants.');
      if (target === e.host_id) throw new HttpError(400, 'The host cannot be removed.');
      if (action === 'approve') {
        if (e.status !== 'active') throw new HttpError(409, 'Game is cancelled.');
        const count = (
          await tx.query(
            "SELECT count(*)::int AS count FROM event_participants WHERE event_id=$1 AND status='approved'",
            [e.id],
          )
        ).rows[0].count;
        if (count >= e.max_participants) throw new HttpError(409, 'This game is full.');
        const r = await tx.query(
          "UPDATE event_participants SET status='approved' WHERE event_id=$1 AND user_id=$2 AND status='pending' RETURNING user_id",
          [e.id, target],
        );
        if (!r.rows.length) throw new HttpError(404, 'Pending participant not found.');
        await tx.query(
          'INSERT INTO conversation_members(conversation_id,user_id) SELECT id,$1 FROM conversations WHERE event_id=$2 ON CONFLICT DO NOTHING',
          [target, e.id],
        );
        await notify(
          target,
          req.user!.id,
          'updated',
          'You are approved for ' + e.title,
          '/event/' + e.id,
          e.id,
          tx,
        );
      } else {
        await tx.query('DELETE FROM event_participants WHERE event_id=$1 AND user_id=$2', [
          e.id,
          target,
        ]);
        await tx.query(
          'DELETE FROM conversation_members WHERE user_id=$1 AND conversation_id IN(SELECT id FROM conversations WHERE event_id=$2)',
          [target, e.id],
        );
      }
    });
    res.json({ success: true });
  }),
);
