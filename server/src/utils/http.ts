import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { MulterError } from 'multer';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const wrap =
  (fn: (req: Request, res: Response) => Promise<any>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
export const uuid = z.string().uuid();
export const id = (req: Request, name = 'id') => uuid.parse(req.params[name]);
export const text = (max = 200) => z.string().trim().min(1).max(max);
export const url = z
  .string()
  .url()
  .max(2048)
  .refine((v) => v.startsWith('https://'), 'Use an HTTPS image URL');
export const page = (req: Request) =>
  z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(40),
      offset: z.coerce.number().int().min(0).max(100000).default(0),
    })
    .parse(req.query);
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof MulterError)
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      error:
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Choose a photo up to 5 MB.'
          : 'Upload one photo with your profile details.',
    });
  if (err instanceof z.ZodError)
    return res.status(400).json({
      error: 'Please check your input.',
      details: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.code === '23505') return res.status(409).json({ error: 'This record already exists.' });
  if (err.code === '23503' || err.code === '23514')
    return res.status(400).json({ error: 'The selected data is invalid.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  console.error({ name: err.name, code: err.code, message: err.message });
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
