import crypto from 'crypto';
import { env } from '../config/env';
import { buildSignedPutUrl, deleteS3Object } from '../config/s3';
import { Album } from '../models/Album';
import { Photo } from '../models/Photo';
import { Wedding } from '../models/Wedding';
import {
  buildCoupleFolder,
  generateS3Key,
  isValidObjectId,
  normalizePhone,
  safeExtFromName,
  slugify,
} from '../utils/helpers';

/**
 * Side-effect-free photo / S3 operations used by routes/photo.ts. Pulling
 * these out of the route handler keeps the request layer focused on auth +
 * shape and lets us test the storage logic in isolation.
 */

export type PresignArgs = {
  weddingId: string;
  albumId: string;
  fileName: string;
  mime: string;
};

export async function presignPhotoUpload(args: PresignArgs): Promise<{ key: string; uploadUrl: string; bucket: string }> {
  if (!env.AWS_BUCKET) throw httpError(400, 'AWS_BUCKET env missing');
  if (!isValidObjectId(args.albumId)) throw httpError(400, 'invalid albumId');

  const wedding = await Wedding.findById(args.weddingId).select('weddingSlug phone').lean();
  if (!wedding) throw httpError(400, 'wedding not found');

  const album = await Album.findById(args.albumId).select('weddingId title').lean();
  if (!album) throw httpError(400, 'album not found');
  if (String(album.weddingId) !== String(args.weddingId)) {
    throw httpError(400, 'album does not belong to this weddingId');
  }

  const coupleSlug = slugify(wedding.weddingSlug || `wedding-${args.weddingId}`);
  const phone = normalizePhone(wedding.phone);
  const coupleFolder = buildCoupleFolder(coupleSlug, phone, 0);
  const albumFolder = slugify(album.title);

  const ext = safeExtFromName(args.fileName) || (args.mime.startsWith('video/') ? '.mp4' : '.jpg');
  const key = generateS3Key(coupleFolder, albumFolder, ext);
  const uploadUrl = await buildSignedPutUrl(key, args.mime);

  return { key, uploadUrl, bucket: env.AWS_BUCKET };
}

/**
 * Generate the profile-photo S3 key + presigned PUT URL for a wedding,
 * deleting the previous profile-photo object if one was set.
 */
export async function presignProfilePhotoUpload(args: {
  weddingId: string;
  fileName: string;
  mime: string;
}): Promise<{ key: string; uploadUrl: string; bucket: string }> {
  if (!env.AWS_BUCKET) throw httpError(400, 'AWS_BUCKET env missing');

  const wedding = await Wedding.findById(args.weddingId).select('weddingSlug phone profilePhoto').lean();
  if (!wedding) throw httpError(400, 'wedding not found');

  const coupleSlug = slugify(wedding.weddingSlug || `wedding-${args.weddingId}`);
  const coupleFolder = buildCoupleFolder(coupleSlug, normalizePhone(wedding.phone), 0);
  const ext = safeExtFromName(args.fileName) || '.jpg';
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `${coupleFolder}/userInformation/${ts}_${crypto.randomBytes(4).toString('hex')}${ext}`;
  const uploadUrl = await buildSignedPutUrl(key, args.mime);

  if (wedding.profilePhoto) {
    try { await deleteS3Object(wedding.profilePhoto); } catch {}
  }
  await Wedding.findByIdAndUpdate(args.weddingId, { profilePhoto: key });

  return { key, uploadUrl, bucket: env.AWS_BUCKET };
}

/** Throw a structured HTTP error so route handlers can `res.status(e.status)` cleanly. */
function httpError(status: number, message: string): Error & { status: number; expose: true } {
  const err = new Error(message) as Error & { status: number; expose: true };
  err.status = status;
  err.expose = true;
  return err;
}

export { Photo };
