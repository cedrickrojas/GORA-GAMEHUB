import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const production = process.env.NODE_ENV === 'production';
let secret = process.env.JWT_SECRET;
if (production && (!secret || secret.length < 32 || !process.env.DATABASE_URL))
  throw new Error('Production requires DATABASE_URL and JWT_SECRET of at least 32 characters.');
if (!secret) {
  mkdirSync('.data', { recursive: true });
  const file = resolve('.data/dev-jwt-secret');
  if (!existsSync(file)) writeFileSync(file, randomBytes(48).toString('hex'), { mode: 0o600 });
  secret = readFileSync(file, 'utf8').trim();
}
export const config = {
  production,
  secret,
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  embeddedPath: process.env.EMBEDDED_DB_PATH || '.data/gora',
  uploadsPath: resolve(process.env.UPLOAD_DIR || '.data/uploads'),
  origins: (
    process.env.CORS_ORIGIN ||
    'http://127.0.0.1:4200,http://localhost:4200,http://127.0.0.1:3000,http://localhost:3000'
  )
    .split(',')
    .map((value) => value.trim()),
  appUrl: process.env.APP_URL || 'http://127.0.0.1:4200',
  seedDemo: !production && process.env.SEED_DEMO !== 'false',
};
