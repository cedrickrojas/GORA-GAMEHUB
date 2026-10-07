import { migrate, closeDb } from './db.js';
import { seed } from './seed.js';
import { db } from './db.js';
import { readFileSync } from 'node:fs';
await migrate();
if (process.argv[2] === 'seed') await seed();
if (process.argv[2] === 'sports') await db.query(readFileSync('database/seeds/sports.sql', 'utf8'));
if (process.argv[2] === 'admin') {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('Set ADMIN_EMAIL to an existing registered account.');
  const r = await db.query(
    "UPDATE users SET role='admin' WHERE email=$1 AND status='active' RETURNING id",
    [email],
  );
  if (!r.rows.length) throw new Error('No active registered account matches ADMIN_EMAIL.');
  console.log('Administrator role granted to the selected account.');
}
await closeDb();
console.log('Database ready.');
