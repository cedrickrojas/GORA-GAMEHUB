import { Router } from 'express';
import { z } from 'zod';
import { db, transaction } from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap, text, uuid, id, HttpError } from '../utils/http.js';
import { notify } from '../services/notifications.js';
export const messages = Router();
messages.use(requireAuth);
messages.get(
  '/',
  wrap(async (req, res) =>
    res.json(
      (
        await db.query(
          `SELECT c.*,
 COALESCE((SELECT u.full_name FROM conversation_members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=c.id AND m.user_id<>$1 LIMIT 1),c.title) AS peer_name,
 (SELECT p.avatar_url FROM conversation_members m JOIN profiles p ON p.user_id=m.user_id WHERE m.conversation_id=c.id AND m.user_id<>$1 LIMIT 1) AS avatar_url,
 (SELECT body FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
 (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
 (SELECT count(*)::int FROM messages WHERE conversation_id=c.id AND sender_id<>$1 AND created_at>cm.last_read_at) AS unread
 FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id WHERE cm.user_id=$1 ORDER BY COALESCE((SELECT max(created_at) FROM messages WHERE conversation_id=c.id),c.created_at) DESC`,
          [req.user!.id],
        )
      ).rows,
    ),
  ),
);
messages.post(
  '/',
  wrap(async (req, res) => {
    const { user_id } = z.object({ user_id: uuid }).parse(req.body);
    if (user_id === req.user!.id) throw new HttpError(400, 'Choose another person.');
    const key = [user_id, req.user!.id].sort().join(':');
    const c = await transaction(async (tx) => {
      const u = (
        await tx.query("SELECT full_name FROM users WHERE id=$1 AND status='active'", [user_id])
      ).rows[0];
      if (!u) throw new HttpError(404, 'Person unavailable.');
      const c = (
        await tx.query(
          'INSERT INTO conversations(title,direct_key) VALUES($1,$2) ON CONFLICT(direct_key) DO UPDATE SET direct_key=EXCLUDED.direct_key RETURNING *',
          [u.full_name, key],
        )
      ).rows[0];
      for (const user of [user_id, req.user!.id])
        await tx.query(
          'INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [c.id, user],
        );
      return c;
    });
    res.status(201).json(c);
  }),
);
async function member(c: string, u: string) {
  if (
    !(
      await db.query('SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2', [
        c,
        u,
      ])
    ).rows.length
  )
    throw new HttpError(403, 'You are not a member of this conversation.');
}
messages.get(
  '/:id/messages',
  wrap(async (req, res) => {
    const c = id(req);
    await member(c, req.user!.id);
    const before = req.query.before
      ? z.iso.datetime({ offset: true }).parse(req.query.before)
      : new Date().toISOString();
    const result = (
      await db.query(
        `SELECT m.*,u.full_name,u.username,p.avatar_url FROM messages m JOIN users u ON u.id=m.sender_id JOIN profiles p ON p.user_id=u.id WHERE m.conversation_id=$1 AND m.created_at<$2 ORDER BY m.created_at DESC LIMIT 100`,
        [c, before],
      )
    ).rows.reverse();
    if (result.length)
      await db.query(
        'UPDATE conversation_members SET last_read_at=GREATEST(last_read_at,$3::timestamptz) WHERE conversation_id=$1 AND user_id=$2',
        [c, req.user!.id, result.at(-1).created_at],
      );
    res.json(result);
  }),
);
messages.post(
  '/:id/messages',
  wrap(async (req, res) => {
    const c = id(req);
    const { body } = z.object({ body: text(2000) }).parse(req.body);
    const m = await transaction(async (tx) => {
      const access = (
        await tx.query(
          'SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2 FOR UPDATE',
          [c, req.user!.id],
        )
      ).rows.length;
      if (!access) throw new HttpError(403, 'You are not a member of this conversation.');
      const event = (
        await tx.query(
          'SELECT e.status FROM events e JOIN conversations c ON c.event_id=e.id WHERE c.id=$1',
          [c],
        )
      ).rows[0];
      if (event?.status === 'cancelled') throw new HttpError(409, 'This event chat is closed.');
      const m = (
        await tx.query(
          'INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,$3) RETURNING *',
          [c, req.user!.id, body],
        )
      ).rows[0];
      await tx.query('UPDATE conversations SET updated_at=now() WHERE id=$1', [c]);
      for (const u of (
        await tx.query('SELECT user_id FROM conversation_members WHERE conversation_id=$1', [c])
      ).rows)
        await notify(
          u.user_id,
          req.user!.id,
          'message',
          req.user!.full_name + ' sent you a message',
          '/tabs/messages?conversation=' + c,
          null,
          tx,
        );
      return m;
    });
    res.status(201).json(m);
  }),
);
