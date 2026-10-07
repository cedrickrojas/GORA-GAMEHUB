import { db, type Sql } from '../database/db.js';
export async function notify(
  user: string,
  actor: string | null,
  type: string,
  title: string,
  link: string,
  event: string | null = null,
  sql: Sql = db,
) {
  if (user === actor) return;
  await sql.query(
    'INSERT INTO notifications(user_id,actor_id,type,title,link,event_id) VALUES($1,$2,$3,$4,$5,$6)',
    [user, actor, type, title, link, event],
  );
}
export async function reminders() {
  await db.query(`INSERT INTO notifications(user_id,type,title,link,event_id)
 SELECT p.user_id,'reminder',e.title || ' starts soon','/event/' || e.id,e.id FROM events e JOIN event_participants p ON p.event_id=e.id AND p.status='approved'
 WHERE e.status='active' AND e.starts_at BETWEEN now() AND now()+interval '24 hours'
 ON CONFLICT (user_id,event_id,type) WHERE type='reminder' DO NOTHING`);
}
