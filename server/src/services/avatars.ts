import { mkdir, writeFile, unlink, access } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';
import { config } from '../config/env.js';
import { HttpError } from '../utils/http.js';

export const avatarDirectory = resolve(config.uploadsPath, 'avatars');
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const managedAvatar = new RegExp(`^/api/uploads/avatars/(${uuid})/(${uuid})\\.webp$`, 'i');

export function ownAvatarPath(url: string | null | undefined, userId: string) {
  const match = url?.match(managedAvatar);
  if (!match || match[1].toLowerCase() !== userId.toLowerCase()) return null;
  return resolve(avatarDirectory, match[1], match[2] + '.webp');
}

export async function validateExistingAvatar(url: string | null | undefined, userId: string) {
  if (!url || url.startsWith('https://')) return;
  const path = ownAvatarPath(url, userId);
  if (!path) throw new HttpError(400, 'Choose your own uploaded profile photo.');
  try {
    await access(path);
  } catch {
    throw new HttpError(400, 'That photo is unavailable. Please upload it again.');
  }
}

export async function prepareAvatar(userId: string, input: Buffer) {
  if (!input.length || input.length > MAX_PHOTO_BYTES)
    throw new HttpError(400, 'Choose a photo up to 5 MB.');
  let bytes: Buffer;
  try {
    const image = sharp(input, { limitInputPixels: 24_000_000, failOn: 'error' });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1)
      throw new HttpError(400, 'Choose a still JPG, PNG, or WebP photo.');
    bytes = await image
      .rotate()
      .resize(512, 512, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      400,
      'This photo could not be read. Use a JPG, PNG, or WebP under 24 megapixels.',
    );
  }
  const url = `/api/uploads/avatars/${userId}/${randomUUID()}.webp`;
  const path = ownAvatarPath(url, userId)!;
  return { url, path, bytes };
}

export async function storeAvatar(photo: Awaited<ReturnType<typeof prepareAvatar>>) {
  await mkdir(dirname(photo.path), { recursive: true });
  await writeFile(photo.path, photo.bytes, { flag: 'wx', mode: 0o600 });
}

export async function removeAvatar(url: string | null | undefined, userId: string) {
  const path = ownAvatarPath(url, userId);
  if (path) await unlink(path).catch(() => {});
}
