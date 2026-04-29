import { Router, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { buildSignedReadUrl, buildSignedPutUrl, deleteS3Object, s3Legacy } from '../config/s3';
import { indexPhotoIntoCollection } from '../config/rekognition';
import { Wedding } from '../models/Wedding';
import { Album } from '../models/Album';
import { Photo } from '../models/Photo';
import { User } from '../models/User';
import {
  toBytes,
  formatUploadedLabel,
  slugify,
  normalizePhone,
  safeExtFromName,
  buildCoupleFolder,
  generateS3Key,
  isValidObjectId,
} from '../utils/helpers';
import { authRequired, AuthRequest } from '../middleware/auth';
import { loadOwnedWedding } from '../utils/ownership';

const router = Router();

// Every /api/photos/* route is wedding-scoped — gate the whole router behind
// authRequired and per-handler ownership checks below.
router.use(authRequired);

/**
 * Look up the wedding for a given album and verify the authenticated user
 * owns it. Used by routes that take an albumId rather than a weddingId.
 */
async function ownsAlbum(userId: string, albumId: string) {
  if (!isValidObjectId(albumId)) {
    return { ok: false as const, status: 400 as const, error: 'invalid album id' };
  }
  const album = await Album.findById(albumId).select('weddingId').lean();
  if (!album) return { ok: false as const, status: 404 as const, error: 'Album not found' };
  const own = await loadOwnedWedding(userId, { weddingId: String(album.weddingId) });
  if (!own.ok) return own;
  return { ok: true as const, album, weddingId: String(album.weddingId) };
}

/**
 * Look up the wedding for a given photo (via its albumId) and verify the
 * authenticated user owns it.
 */
async function ownsPhoto(userId: string, photoId: string) {
  if (!isValidObjectId(photoId)) {
    return { ok: false as const, status: 400 as const, error: 'invalid photo id' };
  }
  const photo = await Photo.findById(photoId).lean();
  if (!photo) return { ok: false as const, status: 404 as const, error: 'Photo not found' };
  if (!photo.albumId) {
    return { ok: false as const, status: 403 as const, error: 'Forbidden' };
  }
  const album = await Album.findById(photo.albumId).select('weddingId').lean();
  if (!album) return { ok: false as const, status: 403 as const, error: 'Forbidden' };
  const own = await loadOwnedWedding(userId, { weddingId: String(album.weddingId) });
  if (!own.ok) return own;
  return { ok: true as const, photo, album, weddingId: String(album.weddingId) };
}

// POST /api/photos/presign
router.post('/presign', async (req: AuthRequest, res: Response) => {
  try {
    const { weddingId, albumId, originalFileName, mimeType } = req.body || {};
    const fileName = String(originalFileName || '').trim();
    const mime = String(mimeType || '').trim();

    if (!env.AWS_BUCKET) return res.status(400).json({ error: 'AWS_BUCKET env missing' });
    if (!weddingId) return res.status(400).json({ error: 'weddingId is required' });
    if (!albumId) return res.status(400).json({ error: 'albumId is required' });
    if (!fileName) return res.status(400).json({ error: 'originalFileName is required' });
    if (!mime) return res.status(400).json({ error: 'mimeType is required' });
    if (!isValidObjectId(albumId)) return res.status(400).json({ error: 'invalid albumId' });

    const own = await loadOwnedWedding(req.user!.id, { weddingId });
    if (!own.ok) return res.status(own.status).json({ error: own.error });

    const wedding = own.wedding;
    const coupleSlug = slugify(wedding.weddingSlug || `wedding-${weddingId}`);
    const phone = normalizePhone(wedding.phone);
    const coupleFolder = buildCoupleFolder(coupleSlug, phone, 0);

    if (!isValidObjectId(albumId)) return res.status(400).json({ error: 'invalid albumId' });
    const album = await Album.findById(albumId).select('weddingId title').lean();
    if (!album) return res.status(400).json({ error: 'album not found' });
    if (String(album.weddingId) !== String(weddingId)) {
      return res.status(400).json({ error: 'album does not belong to this weddingId' });
    }

    const albumFolder = slugify(album.title);
    const ext = safeExtFromName(fileName) || (mime.startsWith('video/') ? '.mp4' : '.jpg');
    const key = generateS3Key(coupleFolder, albumFolder, ext);
    const uploadUrl = await buildSignedPutUrl(key, mime);

    res.json({ data: { key, uploadUrl, bucket: env.AWS_BUCKET } });
  } catch (err: any) {
    console.error('PRESIGN ERROR:', err);
    res.status(500).json({ error: `presign failed: ${err?.message || 'unknown'}` });
  }
});

// POST /api/photos
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { image_url, album, uploaded_by, userId, size_bytes, file_name, checksum, duplicate_group, media_type, mime_type } = req.body?.data || {};
    if (!image_url) return res.status(400).json({ error: 'image_url is required' });
    if (!album) return res.status(400).json({ error: 'album is required' });

    const ownAlbum = await ownsAlbum(req.user!.id, String(album));
    if (!ownAlbum.ok) return res.status(ownAlbum.status).json({ error: ownAlbum.error });

    const albumData = await Album.findById(album).select('weddingId title').lean();
    if (!albumData) return res.status(400).json({ error: `Album ${album} does not exist` });
    const albumId: string = String(albumData._id);

    const rawUserId = uploaded_by ?? userId;
    let uploadedById: string | null = null;
    if (rawUserId) {
      const userData = await User.findById(rawUserId).select('_id').lean();
      if (!userData) return res.status(400).json({ error: `User ${rawUserId} does not exist` });
      uploadedById = String(userData._id);
    }

    const photo = await Photo.create({
      image_url, albumId, uploadedById, size_bytes: toBytes(size_bytes),
      file_name: String(file_name || '').trim() || null, checksum: String(checksum || '').trim() || null,
      duplicate_group: String(duplicate_group || '').trim() || null,
      media_type: String(media_type || '').trim() || 'image', mime_type: String(mime_type || '').trim() || null,
    });

    // Index into Rekognition
    try {
      const isImage = String(media_type || 'image').trim().toLowerCase() === 'image';
      if (albumData?.weddingId && isImage) {
        await indexPhotoIntoCollection({ photoId: String(photo._id), imageKey: String(image_url).trim(), weddingId: String(albumData.weddingId) });
      }
    } catch (rekErr: any) { console.error('Rekognition indexing failed', rekErr.message); }

    const finalPhoto = await Photo.findById(photo._id).populate('albumId', 'title').populate('uploadedById', 'username email').lean();
    res.json({ data: finalPhoto });
  } catch (err: any) {
    console.error('savePhoto error', err);
    res.status(500).json({ error: err.message || 'savePhoto failed' });
  }
});

// GET /api/photos/storage-summary
router.get('/storage-summary', async (req: AuthRequest, res: Response) => {
  try {
    const weddingId = String(req.query?.weddingId || '').trim();
    if (!weddingId) return res.status(400).json({ error: 'weddingId is required' });

    const own = await loadOwnedWedding(req.user!.id, { weddingId });
    if (!own.ok) return res.status(own.status).json({ error: own.error });

    const TOTAL_STORAGE_BYTES = 300 * 1024 * 1024 * 1024;
    const albumIds = (await Album.find({ weddingId }).select('_id').lean()).map((a) => a._id);

    if (!albumIds.length) return res.json({ data: { totalBytes: TOTAL_STORAGE_BYTES, usedBytes: 0, remainingBytes: TOTAL_STORAGE_BYTES, imageBytes: 0, videoBytes: 0 } });

    const photos = await Photo.find({ albumId: { $in: albumIds } }).select('size_bytes file_name image_url media_type').lean();

    let imageBytes = 0, videoBytes = 0;
    for (const p of photos) {
      const bytes = Number(p.size_bytes || 0);
      const mt = String(p.media_type || '').toLowerCase();
      const fn = String(p.file_name || p.image_url || '').toLowerCase();
      if (mt === 'video' || /\.(mp4|mov|avi|mkv|webm|m4v)$/.test(fn)) videoBytes += bytes; else imageBytes += bytes;
    }

    const usedBytes = imageBytes + videoBytes;
    res.json({ data: { totalBytes: TOTAL_STORAGE_BYTES, usedBytes, remainingBytes: Math.max(0, TOTAL_STORAGE_BYTES - usedBytes), imageBytes, videoBytes } });
  } catch (err: any) { console.error('storageSummary error', err); res.status(500).json({ error: err.message }); }
});

// POST /api/photos/sync-sizes — fix photos where size_bytes = 0 by fetching from S3
router.post('/sync-sizes', async (req: AuthRequest, res: Response) => {
  try {
    const weddingId = String(req.body?.weddingId || req.query?.weddingId || '').trim();
    if (!weddingId) return res.status(400).json({ error: 'weddingId is required' });
    if (!env.AWS_BUCKET) return res.status(400).json({ error: 'AWS_BUCKET env missing' });

    const own = await loadOwnedWedding(req.user!.id, { weddingId });
    if (!own.ok) return res.status(own.status).json({ error: own.error });

    const albumIds = (await Album.find({ weddingId }).select('_id').lean()).map((a) => a._id);
    if (!albumIds.length) return res.json({ data: { updated: 0, skipped: 0 } });

    const photos = await Photo.find({ albumId: { $in: albumIds }, $or: [{ size_bytes: 0 }, { size_bytes: null }, { size_bytes: { $exists: false } }] })
      .select('_id image_url size_bytes').lean();

    let updated = 0, skipped = 0;

    for (const photo of photos) {
      const key = String(photo.image_url || '').trim();
      if (!key) { skipped++; continue; }
      try {
        const head = await s3Legacy.headObject({ Bucket: env.AWS_BUCKET, Key: key }).promise();
        const bytes = Number(head.ContentLength || 0);
        if (bytes > 0) {
          await Photo.updateOne({ _id: photo._id }, { $set: { size_bytes: bytes } });
          updated++;
        } else { skipped++; }
      } catch { skipped++; }
    }

    res.json({ data: { updated, skipped, total: photos.length } });
  } catch (err: any) { console.error('syncSizes error', err); res.status(500).json({ error: err.message }); }
});

// POST /api/photos/check-duplicate
router.post('/check-duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const { albumId, weddingId, fileName, checksum, size_bytes } = req.body || {};
    if (!albumId) return res.status(400).json({ error: 'albumId is required' });
    if (!weddingId) return res.status(400).json({ error: 'weddingId is required' });
    if (!isValidObjectId(albumId)) return res.status(400).json({ error: 'invalid albumId' });

    const own = await loadOwnedWedding(req.user!.id, { weddingId });
    if (!own.ok) return res.status(own.status).json({ error: own.error });

    const album = await Album.findById(albumId).select('weddingId').lean();
    if (!album) return res.status(400).json({ error: 'album not found' });
    if (String(album.weddingId) !== String(weddingId)) return res.status(400).json({ error: 'album does not belong to this weddingId' });

    const albumIds = (await Album.find({ weddingId }).select('_id').lean()).map((a) => a._id);
    let existingPhoto: any = null;

    if (String(checksum || '').trim()) {
      existingPhoto = await Photo.findOne({ checksum: String(checksum).trim(), albumId: { $in: albumIds } }).populate('albumId', 'title').populate('uploadedById', 'username email').sort({ createdAt: 1 }).lean();
    }
    if (!existingPhoto && String(fileName || '').trim()) {
      existingPhoto = await Photo.findOne({ file_name: String(fileName).trim(), albumId }).populate('albumId', 'title').populate('uploadedById', 'username email').sort({ createdAt: 1 }).lean();
    }

    if (!existingPhoto) return res.json({ duplicate: false, data: null });

    const existingKey = String(existingPhoto.image_url || '').trim();
    const previewUrl = existingKey ? await buildSignedReadUrl(existingKey) : null;

    res.json({
      duplicate: true,
      data: {
        matchType: checksum ? 'checksum' : 'file_name',
        existingPhoto: {
          id: existingPhoto._id, image_url: existingKey, previewUrl,
          fileName: String(existingPhoto.file_name || ''), size_bytes: toBytes(existingPhoto.size_bytes),
          uploadedAt: existingPhoto.createdAt || null, uploadedLabel: formatUploadedLabel(existingPhoto.createdAt),
          albumId: (existingPhoto.albumId as any)?._id || null, albumTitle: (existingPhoto.albumId as any)?.title || null,
          uploadedBy: (existingPhoto.uploadedById as any)?._id || null,
          checksum: String(existingPhoto.checksum || ''), duplicate_group: String(existingPhoto.duplicate_group || ''),
          media_type: String(existingPhoto.media_type || ''), mime_type: String(existingPhoto.mime_type || ''),
        },
        incomingPhoto: { fileName: String(fileName || ''), size_bytes: toBytes(size_bytes), checksum: String(checksum || '') },
      },
    });
  } catch (err: any) { console.error('checkDuplicate error', err); res.status(500).json({ error: err.message }); }
});

// POST /api/photos/resolve-duplicate
router.post('/resolve-duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const { action, existingPhotoId, newPhoto } = req.body || {};
    if (!['skip', 'replace'].includes(String(action || ''))) return res.status(400).json({ error: 'action must be skip or replace' });
    if (!existingPhotoId) return res.status(400).json({ error: 'existingPhotoId is required' });

    const ownPhoto = await ownsPhoto(req.user!.id, String(existingPhotoId));
    if (!ownPhoto.ok) return res.status(ownPhoto.status).json({ error: ownPhoto.error });
    const existing = ownPhoto.photo;
    if (action === 'skip') return res.json({ success: true, action: 'skip', data: { existingPhotoId } });

    const np = newPhoto || {};
    const nextImageUrl = String(np.image_url || '').trim();
    if (!nextImageUrl) return res.status(400).json({ error: 'newPhoto.image_url is required' });

    const oldKey = String(existing.image_url || '').trim();
    if (oldKey && oldKey !== nextImageUrl) { try { await deleteS3Object(oldKey); } catch (e) {} }

    await Photo.findByIdAndUpdate(existingPhotoId, {
      image_url: nextImageUrl, size_bytes: toBytes(np.size_bytes),
      file_name: String(np.file_name || '').trim() || null, checksum: String(np.checksum || '').trim() || null,
      duplicate_group: String(np.duplicate_group || '').trim() || null,
      media_type: String(np.media_type || '').trim() || 'image', mime_type: String(np.mime_type || '').trim() || null,
      ...(np.album ? { albumId: np.album } : {}), ...(np.uploaded_by ? { uploadedById: np.uploaded_by } : {}),
    });

    const updated = await Photo.findById(existingPhotoId).populate('albumId', 'title').populate('uploadedById', 'username email').lean();
    const updatedKey = String(updated?.image_url || '').trim();

    res.json({ success: true, action: 'replace', data: { photo: { ...updated, previewUrl: updatedKey ? await buildSignedReadUrl(updatedKey) : null } } });
  } catch (err: any) { console.error('resolveDuplicate error', err); res.status(500).json({ error: err.message }); }
});

// POST /api/photos/profile-photo/presign
router.post('/profile-photo/presign', async (req: AuthRequest, res: Response) => {
  try {
    const { weddingId, originalFileName, mimeType } = req.body || {};
    if (!env.AWS_BUCKET || !weddingId || !originalFileName || !mimeType) return res.status(400).json({ error: 'weddingId, originalFileName, mimeType required' });

    const own = await loadOwnedWedding(req.user!.id, { weddingId });
    if (!own.ok) return res.status(own.status).json({ error: own.error });

    const wedding = own.wedding;
    const coupleSlug = slugify(wedding.weddingSlug || `wedding-${weddingId}`);
    const coupleFolder = buildCoupleFolder(coupleSlug, normalizePhone(wedding.phone), 0);
    const ext = safeExtFromName(String(originalFileName)) || '.jpg';
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `${coupleFolder}/userInformation/${ts}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const uploadUrl = await buildSignedPutUrl(key, String(mimeType));

    if (wedding.profilePhoto) { try { await deleteS3Object(wedding.profilePhoto); } catch (e) {} }
    await Wedding.findByIdAndUpdate(weddingId, { profilePhoto: key });

    res.json({ data: { key, uploadUrl, bucket: env.AWS_BUCKET } });
  } catch (err: any) { console.error('presignProfilePhoto error', err); res.status(500).json({ error: err.message }); }
});

// GET /api/photos/profile-photo
router.get('/profile-photo', async (req: AuthRequest, res: Response) => {
  try {
    const weddingId = String(req.query?.weddingId || '').trim();
    if (!weddingId) return res.status(400).json({ error: 'weddingId is required' });

    const own = await loadOwnedWedding(req.user!.id, { weddingId });
    if (!own.ok) return res.status(own.status).json({ error: own.error });

    const key = (own.wedding.profilePhoto || '').trim();
    if (!key) return res.json({ data: { profilePhoto: null, url: null } });
    res.json({ data: { profilePhoto: key, url: await buildSignedReadUrl(key) } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/photos
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const albumId = String(req.query?.albumId || '').trim();
    if (!albumId) return res.status(400).json({ error: 'albumId is required' });

    const ownAlbum = await ownsAlbum(req.user!.id, albumId);
    if (!ownAlbum.ok) return res.status(ownAlbum.status).json({ error: ownAlbum.error });

    const limitRaw = parseInt(String(req.query?.limit || '60'), 10);
    const limit = Math.max(1, Math.min(isNaN(limitRaw) ? 60 : limitRaw, 200));
    const cursor = String(req.query?.cursor || '').trim();

    const filter: any = { albumId };
    const uid = String(req.query?.userId || req.query?.uploaded_by || '').trim();
    if (uid) filter.uploadedById = uid;

    // Only run countDocuments on the first page (no cursor). On a 10k-photo
    // album this skips an expensive query for every "load more" tap; the
    // client already has the count from page 1 of the session.
    const totalCount = cursor ? null : await Photo.countDocuments(filter);

    // cursor is the _id of the last item from the previous page
    // since we sort by createdAt desc, we fetch items created before the cursor item
    if (cursor) {
      const cursorDoc = await Photo.findById(cursor).select('createdAt').lean();
      if (cursorDoc) {
        filter.$or = [
          { createdAt: { $lt: cursorDoc.createdAt } },
          { createdAt: cursorDoc.createdAt, _id: { $lt: cursorDoc._id } },
        ];
      }
    }

    const photos = await Photo.find(filter)
      .populate('albumId', 'title')
      .populate('uploadedById', 'username email')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = photos.length > limit;
    const page = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

    const result = await Promise.all(page.map(async (p: any) => {
      const key = String(p.image_url || '').trim();
      if (!key) return null;
      return {
        id: p._id, uri: await buildSignedReadUrl(key),
        albumId: p.albumId?._id || null, albumTitle: p.albumId?.title || null,
        uploadedBy: p.uploadedById?._id || null, uploadedAt: p.createdAt || null,
        uploadedLabel: formatUploadedLabel(p.createdAt), sizeBytes: toBytes(p.size_bytes),
        fileName: String(p.file_name || ''), checksum: String(p.checksum || ''),
        duplicate_group: String(p.duplicate_group || ''), media_type: String(p.media_type || ''),
        mime_type: String(p.mime_type || ''), key,
      };
    }));

    res.json({
      data: result.filter(Boolean),
      meta: { albumId, limit, nextCursor, hasMore, totalCount },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/photos/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ownPhoto = await ownsPhoto(req.user!.id, req.params.id);
    if (!ownPhoto.ok) return res.status(ownPhoto.status).json({ error: ownPhoto.error });

    const photo = await Photo.findById(req.params.id).populate('albumId', 'title').populate('uploadedById', 'username email').lean();
    if (!photo) return res.status(404).json({ error: 'Not found' });
    const key = String(photo.image_url || '').trim();
    if (!key) return res.status(400).json({ error: 'Photo has no image_url' });
    res.json({ data: { ...photo, id: photo._id, uri: await buildSignedReadUrl(key), key } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/photos/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ownPhoto = await ownsPhoto(req.user!.id, req.params.id);
    if (!ownPhoto.ok) return res.status(ownPhoto.status).json({ error: ownPhoto.error });
    const photo = ownPhoto.photo;

    const key = String(photo.image_url || '').trim();
    if (!key) return res.status(400).json({ error: 'Photo has no image_url' });

    await deleteS3Object(key);
    await Photo.findByIdAndDelete(photo._id);
    res.json({ data: { id: photo._id, deleted: true, key, sizeBytes: toBytes(photo.size_bytes) } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
