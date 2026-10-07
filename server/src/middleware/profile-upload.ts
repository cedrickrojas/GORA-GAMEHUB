import type { RequestHandler } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { id, HttpError } from '../utils/http.js';
import { MAX_PHOTO_BYTES } from '../services/avatars.js';

export const ownProfile: RequestHandler = (req, _res, next) => {
  try {
    if (id(req) !== req.user!.id) throw new HttpError(403, 'You can edit only your own profile.');
    next();
  } catch (error) {
    next(error);
  }
};

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user!.id,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many photo uploads. Please try again later.' },
});
export const profileUploadLimit: RequestHandler = (req, res, next) => {
  if (req.is('multipart/form-data')) uploadLimiter(req, res, next);
  else next();
};

export const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 1, fieldSize: 64 * 1024, parts: 2 },
  fileFilter: (_req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) callback(null, true);
    else callback(new HttpError(400, 'Choose a JPG, PNG, or WebP photo.'));
  },
}).single('photo');
