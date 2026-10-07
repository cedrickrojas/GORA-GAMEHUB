import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { optionalAuth } from './middleware/auth.js';
import { errorHandler } from './utils/http.js';
import { api } from './routes/index.js';
import { db } from './database/db.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { avatarDirectory } from './services/avatars.js';
export const app = express();
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: config.production ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || config.origins.includes(origin)),
    credentials: true,
  }),
);
app.use(express.json({ limit: '64kb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: config.production ? 240 : 1200,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Please slow down and try again.' },
  }),
);
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    origin &&
    !config.origins.includes(origin) &&
    origin !== config.appUrl
  ) {
    res.status(403).json({ error: 'Request origin is not allowed.' });
    return;
  }
  res.set('Cache-Control', 'no-store');
  next();
});
app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      database: config.databaseUrl ? 'postgresql' : 'embedded-postgresql',
      demo: config.seedDemo,
    });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});
app.get('/api/settings', async (_req, res, next) => {
  try {
    res.json((await db.query('SELECT key,value FROM system_settings')).rows);
  } catch (e) {
    next(e);
  }
});
app.use(
  '/api/uploads/avatars',
  express.static(avatarDirectory, {
    index: false,
    redirect: false,
    dotfiles: 'deny',
    setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'),
  }),
);
app.use('/api', optionalAuth, api);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});
const frontend = resolve('dist/gora/browser');
if (existsSync(frontend)) {
  app.use(express.static(frontend));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(frontend, 'index.html')));
}
app.use(errorHandler);
