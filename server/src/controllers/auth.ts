import { Router, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { db, transaction } from '../database/db.js';
import { wrap, text, HttpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { profileSelect } from '../models/queries.js';
export const auth = Router();
auth.use(
  ['/register', '/login', '/forgot-password', '/reset-password', '/demo'],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again later.' },
  }),
);
const password = z
  .string()
  .min(10)
  .max(72)
  .refine(
    (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v),
    'Use upper and lowercase letters and a number.',
  );
const registration = z
  .object({
    full_name: text(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,30}$/),
    email: z.email().toLowerCase().max(254),
    password,
    confirm_password: z.string(),
    date_of_birth: z.iso.date().refine((v) => {
      const age = (Date.now() - new Date(v).getTime()) / 31557600000;
      return age >= 13 && age < 120;
    }, 'You must be at least 13 years old.'),
    location: text(120),
    favorite_sports: z.array(text(40)).min(1).max(13),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: 'Passwords must match.',
    path: ['confirm_password'],
  });
function session(res: Response, u: any) {
  const token = jwt.sign({ version: u.token_version }, config.secret, {
    subject: u.id,
    expiresIn: '7d',
    issuer: 'gora',
    audience: 'gora-app',
    algorithm: 'HS256',
  });
  res.cookie('gora_session', token, {
    httpOnly: true,
    secure: config.production,
    sameSite: 'lax',
    maxAge: 7 * 86400000,
    path: '/',
  });
}
auth.post(
  '/register',
  wrap(async (req, res) => {
    const v = registration.parse(req.body);
    const hash = await bcrypt.hash(v.password, 12);
    const u = await transaction(async (tx) => {
      const sports = await tx.query('SELECT id FROM sports WHERE name=ANY($1::text[])', [
        v.favorite_sports,
      ]);
      if (sports.rows.length !== new Set(v.favorite_sports).size)
        throw new HttpError(400, 'Select valid sports.');
      const u = (
        await tx.query(
          'INSERT INTO users(email,username,full_name,password_hash,date_of_birth) VALUES($1,$2,$3,$4,$5) RETURNING *',
          [v.email, v.username, v.full_name, hash, v.date_of_birth],
        )
      ).rows[0];
      await tx.query('INSERT INTO profiles(user_id,location) VALUES($1,$2)', [u.id, v.location]);
      for (const s of sports.rows)
        await tx.query('INSERT INTO user_sports VALUES($1,$2,now())', [u.id, s.id]);
      return u;
    });
    session(res, u);
    res.status(201).json((await db.query(profileSelect + ' WHERE u.id=$1', [u.id])).rows[0]);
  }),
);
auth.post(
  '/login',
  wrap(async (req, res) => {
    const v = z
      .object({ email: z.email().toLowerCase(), password: z.string().min(1).max(72) })
      .parse(req.body);
    const u = (await db.query('SELECT * FROM users WHERE email=$1', [v.email])).rows[0];
    // Hash comparison runs even for an unknown account to avoid a trivial timing oracle.
    const valid = await bcrypt.compare(
      v.password,
      u?.password_hash || '$2b$12$2b4S4JKTHWoOCqsUP/37puAgdw.evoRH5RfqAqlfwGMFbkcKTa9em',
    );
    if (!u || !valid || u.status !== 'active')
      throw new HttpError(401, 'Invalid email or password.');
    await db.query('UPDATE users SET last_active_at=now() WHERE id=$1', [u.id]);
    session(res, u);
    res.json((await db.query(profileSelect + ' WHERE u.id=$1', [u.id])).rows[0]);
  }),
);
auth.get(
  '/me',
  requireAuth,
  wrap(async (req, res) =>
    res.json((await db.query(profileSelect + ' WHERE u.id=$1', [req.user!.id])).rows[0]),
  ),
);
auth.post(
  '/logout',
  requireAuth,
  wrap(async (req, res) => {
    await db.query('UPDATE users SET token_version=token_version+1 WHERE id=$1', [req.user!.id]);
    res.clearCookie('gora_session', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.production,
    });
    res.json({ success: true });
  }),
);
auth.post(
  '/demo',
  wrap(async (_req, res) => {
    if (!config.seedDemo) throw new HttpError(404, 'Demo access is disabled.');
    const u = (await db.query("SELECT * FROM users WHERE username='alexreyes' AND status='active'"))
      .rows[0];
    if (!u) throw new HttpError(404, 'Demo account unavailable.');
    session(res, u);
    res.json((await db.query(profileSelect + ' WHERE u.id=$1', [u.id])).rows[0]);
  }),
);
auth.post(
  '/forgot-password',
  wrap(async (req, res) => {
    if (config.production && !process.env.SMTP_HOST)
      throw new HttpError(503, 'Password recovery is temporarily unavailable.');
    const { email } = z.object({ email: z.email().toLowerCase() }).parse(req.body);
    const u = (
      await db.query('SELECT id FROM users WHERE email=$1 AND status=$2', [email, 'active'])
    ).rows[0];
    let devLink: string | undefined;
    if (u) {
      const token = randomBytes(32).toString('hex');
      const hash = createHash('sha256').update(token).digest('hex');
      await db.query(
        "INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
        [hash, u.id],
      );
      const link = config.appUrl + '/reset-password?token=' + token;
      if (process.env.SMTP_HOST) {
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        });
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: 'Reset your GORA password',
          text: `Reset your password within 30 minutes: ${link}\nIf you did not request this, ignore this email.`,
        });
      } else if (!config.production) devLink = link;
      else throw new HttpError(503, 'Password recovery is temporarily unavailable.');
    }
    res.json({
      message: 'If that account exists, a reset link has been sent.',
      ...(devLink ? { development_reset_link: devLink } : {}),
    });
  }),
);
auth.post(
  '/reset-password',
  wrap(async (req, res) => {
    const v = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password, confirm_password: z.string() })
      .refine((v) => v.password === v.confirm_password, { message: 'Passwords must match.' })
      .parse(req.body);
    const hash = createHash('sha256').update(v.token).digest('hex');
    const passwordHash = await bcrypt.hash(v.password, 12);
    await transaction(async (tx) => {
      const r = (
        await tx.query(
          'SELECT * FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE',
          [hash],
        )
      ).rows[0];
      if (!r) throw new HttpError(400, 'This reset link has expired or has already been used.');
      await tx.query(
        'UPDATE users SET password_hash=$1,token_version=token_version+1 WHERE id=$2',
        [passwordHash, r.user_id],
      );
      await tx.query(
        'UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',
        [r.user_id],
      );
    });
    res.json({ message: 'Password updated. You can sign in.' });
  }),
);
