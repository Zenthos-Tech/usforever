import { Router, Response } from 'express';
import { tvAuthMiddleware, TvAuthRequest } from '../middleware/tvAuth';
import { authRequired, AuthRequest } from '../middleware/auth';
import * as tvMediaService from '../services/tvMediaService';
import { Wedding } from '../models/Wedding';
import { Photo } from '../models/Photo';
import { buildSignedReadUrl } from '../config/s3';

const router = Router();

// GET /api/tv/wedding (tv-auth required)
router.get('/wedding', tvAuthMiddleware, async (req: TvAuthRequest, res: Response) => {
  try {
    const weddingId = String(req.tv?.weddingId || '');
    const wedding = await Wedding.findById(weddingId).select('brideName groomName weddingDate profilePhoto').lean();
    if (!wedding) return res.status(404).json({ error: 'Wedding not found' });
    res.json({
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate: wedding.weddingDate,
      profilePhoto: wedding.profilePhoto,
    });
  } catch (err: any) {
    console.error('tv/wedding error', err);
    res.status(500).json({ error: err.message || 'failed' });
  }
});

// GET /api/tv/albums (tv-auth required)
router.get('/albums', tvAuthMiddleware, async (req: TvAuthRequest, res: Response) => {
  try {
    const weddingId = String(req.tv?.weddingId || '');
    const result = await tvMediaService.listAlbums({ weddingId });
    res.json(result);
  } catch (err: any) {
    console.error('tv/albums error', err);
    res.status(500).json({ error: err.message || 'listAlbums failed' });
  }
});

// GET /api/tv/albums/:event/images (tv-auth required)
router.get('/albums/:event/images', tvAuthMiddleware, async (req: TvAuthRequest, res: Response) => {
  try {
    const weddingId = String(req.tv?.weddingId || '');
    const event = String(req.params.event || '').trim();

    const limitRaw = parseInt(String(req.query?.limit || '60'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 200)) : 60;
    const nextToken = req.query?.nextToken ? String(req.query.nextToken) : undefined;

    const result = await tvMediaService.listImages({ weddingId, event, limit, nextToken });
    res.json(result);
  } catch (err: any) {
    console.error('tv/albums/:event/images error', err);
    res.status(500).json({ error: err.message || 'listImages failed' });
  }
});

// PUT /api/tv/selections (auth required — called by mobile app to save selected photos)
router.put('/selections', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { weddingId, photoIds } = req.body || {};
    const wid = String(weddingId || '').trim();
    if (!wid) return res.status(400).json({ error: 'weddingId is required' });
    if (!Array.isArray(photoIds)) return res.status(400).json({ error: 'photoIds must be an array' });

    const ids = photoIds.map((id: any) => String(id)).filter(Boolean);
    await Wedding.findByIdAndUpdate(wid, { tvSelectedPhotoIds: ids });
    res.json({ success: true, count: ids.length });
  } catch (err: any) {
    console.error('tv/selections PUT error', err);
    res.status(500).json({ error: err.message || 'failed' });
  }
});

// DELETE /api/tv/selections/:photoId (auth required — remove one photo from selections)
router.delete('/selections/:photoId', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { weddingId } = req.body || req.query || {};
    const wid = String(weddingId || '').trim();
    const photoId = String(req.params.photoId || '').trim();
    if (!wid) return res.status(400).json({ error: 'weddingId is required' });
    if (!photoId) return res.status(400).json({ error: 'photoId is required' });

    await Wedding.findByIdAndUpdate(wid, { $pull: { tvSelectedPhotoIds: photoId } });
    res.json({ success: true });
  } catch (err: any) {
    console.error('tv/selections DELETE error', err);
    res.status(500).json({ error: err.message || 'failed' });
  }
});

// GET /api/tv/selections (tv-auth — called by TV app to load persisted selections)
router.get('/selections', tvAuthMiddleware, async (req: TvAuthRequest, res: Response) => {
  try {
    const weddingId = String(req.tv?.weddingId || '');
    const wedding = await Wedding.findById(weddingId).select('tvSelectedPhotoIds').lean();
    if (!wedding) return res.status(404).json({ error: 'Wedding not found' });

    const ids: string[] = (wedding as any).tvSelectedPhotoIds || [];
    if (ids.length === 0) return res.json({ weddingId, count: 0, photos: [] });

    const photos = await Photo.find({ _id: { $in: ids } }).select('image_url _id').lean();

    const result = await Promise.all(
      photos.map(async (p) => {
        let url: string | null = null;
        try { url = await buildSignedReadUrl(String(p.image_url)); } catch {}
        return { photoId: String(p._id), key: p.image_url, url };
      })
    );

    res.json({ weddingId, count: result.length, photos: result });
  } catch (err: any) {
    console.error('tv/selections GET error', err);
    res.status(500).json({ error: err.message || 'failed' });
  }
});

export default router;
