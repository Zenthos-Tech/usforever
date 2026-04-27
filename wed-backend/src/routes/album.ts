import { Router, Request, Response } from 'express';
import { Album } from '../models/Album';
import { Photo } from '../models/Photo';
import { Wedding } from '../models/Wedding';
import { buildSignedReadUrl } from '../config/s3';

const router = Router();

const DEFAULTS = [
  { title: 'Wedding', systemKey: 'wedding' },
  { title: 'Engagement', systemKey: 'engagement' },
] as const;

// GET /api/albums?weddingId=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const weddingId = String(req.query?.weddingId || '').trim();
    if (!weddingId) return res.status(400).json({ error: 'weddingId is required' });

    const filter: any = { weddingId, hidden: { $ne: true }, deletedByUser: { $ne: true } };
    const albums = await Album.find(filter).sort({ createdAt: 1 }).limit(200).lean();

    // attach cover image (most recent photo) for each album
    const albumsWithCovers = await Promise.all(
      albums.map(async (album: any) => {
        const firstPhoto = await Photo.findOne({ albumId: album._id })
          .sort({ createdAt: -1 })
          .select('image_url')
          .lean();

        let coverUrl = null;
        if (firstPhoto?.image_url) {
          try {
            coverUrl = await buildSignedReadUrl(String(firstPhoto.image_url));
          } catch {}
        }

        const photoCount = await Photo.countDocuments({ albumId: album._id });

        return { ...album, coverUrl, photoCount };
      })
    );

    res.json({ data: albumsWithCovers });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/albums (create single album)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, weddingId, hidden, userId } = req.body?.data || req.body || {};
    const t = String(title || '').trim();
    const wid = String(weddingId || '').trim();
    if (!t) return res.status(400).json({ error: 'title is required' });
    if (!wid) return res.status(400).json({ error: 'weddingId is required' });

    const dup = await Album.findOne({ weddingId: wid, title: t, hidden: { $ne: true }, deletedByUser: { $ne: true } });
    if (dup) return res.status(400).json({ error: 'An album with this title already exists.' });

    const album = await Album.create({
      title: t, weddingId: wid, hidden: !!hidden, isDefault: false,
      deletedByUser: false, ...(userId ? { userId } : {}),
    });
    res.json({ data: { id: album._id, _id: album._id, title: album.title, weddingId: album.weddingId } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/albums/ensure-defaults
router.post('/ensure-defaults', async (req: Request, res: Response) => {
  try {
    const { weddingId, userId } = req.body || {};
    const wid = String(weddingId || '').trim();
    if (!wid) return res.status(400).json({ error: 'Provide weddingId (string).' });

    const weddingEntity = await Wedding.findById(wid).lean();
    if (!weddingEntity) return res.status(400).json({ error: 'wedding not found' });

    let allAlbums = await Album.find({ weddingId: wid }).sort({ createdAt: 1, _id: 1 }).limit(200).lean();

    // Patch legacy rows
    for (const def of DEFAULTS) {
      const hasKey = allAlbums.some((a) => (a.systemKey || '').trim() === def.systemKey);
      if (!hasKey) {
        const legacy = allAlbums.find((a) => (a.title || '').toLowerCase() === def.title.toLowerCase() && !a.hidden && !a.deletedByUser && !(a.systemKey || '').trim());
        if (legacy) {
          await Album.findByIdAndUpdate(legacy._id, { systemKey: def.systemKey, isDefault: true });
          (legacy as any).systemKey = def.systemKey;
          (legacy as any).isDefault = true;
        }
      }
    }

    // Hide duplicates
    for (const def of DEFAULTS) {
      const candidates = allAlbums.filter((a) => !a.hidden && !a.deletedByUser && ((a.systemKey || '').toLowerCase() === def.systemKey || (a.title || '').toLowerCase() === def.title.toLowerCase()));
      if (candidates.length > 1) {
        for (const extra of candidates.slice(1)) {
          await Album.findByIdAndUpdate(extra._id, { hidden: true, deletedByUser: true });
          (extra as any).hidden = true; (extra as any).deletedByUser = true;
        }
      }
    }

    const created: any[] = [];
    for (const def of DEFAULTS) {
      // Skip if visible OR if user already explicitly deleted it — don't recreate on re-login
      if (allAlbums.some((a) => (a.systemKey || '').trim() === def.systemKey && (!a.hidden || a.deletedByUser))) continue;
      const newAlbum = await Album.create({
        title: def.title, description: 'Default album created automatically', weddingId: wid,
        hidden: false, isDefault: true, deletedByUser: false, systemKey: def.systemKey,
        ...(userId ? { userId } : {}),
      });
      allAlbums.push(newAlbum.toObject());
      created.push({ id: newAlbum._id, title: def.title, systemKey: def.systemKey });
    }

    const visibleAlbums = allAlbums.filter((a) => !a.hidden && !a.deletedByUser);
    res.json({ success: true, createdCount: created.length, created, visibleAlbums, groupUsed: 'weddingId' });
  } catch (err: any) { console.error('ensureDefaults error', err); res.status(500).json({ error: err.message }); }
});

// PUT /api/albums/:id/rename
router.put('/:id/rename', async (req: Request, res: Response) => {
  try {
    const albumId = req.params.id;
    const newTitle = String(req.body?.title || req.body?.name || '').trim();
    if (!newTitle) return res.status(400).json({ error: 'Provide title.' });

    const album = await Album.findById(albumId).lean();
    if (!album) return res.status(404).json({ error: 'Album not found' });
    if (album.deletedByUser || album.hidden) return res.status(400).json({ error: 'This album is deleted/hidden.' });

    const dup = await Album.findOne({ weddingId: album.weddingId, title: newTitle, hidden: { $ne: true }, deletedByUser: { $ne: true }, _id: { $ne: album._id } });
    if (dup) return res.status(400).json({ error: 'An album with this title already exists.' });

    const updated = await Album.findByIdAndUpdate(albumId, { title: newTitle }, { new: true }).lean();
    res.json({ success: true, message: 'Album renamed successfully.', album: updated });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/albums/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const album = await Album.findById(req.params.id).lean();
    if (!album) return res.status(404).json({ error: 'Album not found' });

    if (album.isDefault || (album.systemKey || '').trim()) {
      const hidden = await Album.findByIdAndUpdate(album._id, { hidden: true, deletedByUser: true }, { new: true }).lean();
      return res.json({ success: true, softDeleted: true, message: 'Album hidden successfully.', album: hidden, freedBytes: 0 });
    }

    const photos = await Photo.find({ albumId: album._id }).select('size_bytes').lean();
    let freedBytes = 0;
    for (const p of photos) freedBytes += Number(p.size_bytes || 0);

    await Photo.deleteMany({ albumId: album._id });
    await Album.findByIdAndDelete(album._id);

    res.json({ success: true, softDeleted: false, deletedAlbumId: album._id, deletedPhotos: photos.length, freedBytes, message: 'Album deleted successfully.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
