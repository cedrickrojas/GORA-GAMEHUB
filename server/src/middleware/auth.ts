import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/db.js';
import { config } from '../config/env.js';
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; full_name: string; token_version: number };
    }
  }
}
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('gora_session='))
    ?.slice(13);
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : cookie;
  if (token) {
    try {
      const payload = jwt.verify(token, config.secret, {
        algorithms: ['HS256'],
        issuer: 'gora',
        audience: 'gora-app',
      }) as jwt.JwtPayload;
      const user = (
        await db.query(
          'SELECT id,role,full_name,token_version FROM users WHERE id=$1 AND status=$2',
          [payload.sub, 'active'],
        )
      ).rows[0];
      if (user && user.token_version === payload.version) req.user = user;
    } catch {
      /* An invalid cookie is treated as signed out. */
    }
  }
  next();
};
export const requireAuth: RequestHandler = (req, res, next) =>
  req.user ? next() : void res.status(401).json({ error: 'Sign in to continue.' });
export const requireAdmin: RequestHandler = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : void res.status(403).json({ error: 'Administrator access is required.' });
