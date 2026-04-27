import { Router, Request, Response } from 'express';
import { promises as fsp } from 'fs';
import { searchFaceInWeddingCollection } from '../config/rekognition';
import { buildSignedReadUrl } from '../config/s3';
import { Photo } from '../models/Photo';
import { toBytes, formatUploadedLabel } from '../utils/helpers';

const router = Router();

router.post('/search', async (req: Request, res: Response) => {
  const file = (req as any).file;
  try {
    const weddingId = String(req.body?.weddingId || '').trim();
    if (!weddingId) return res.status(400).json({ error: 'weddingId is required' });

    if (!file) return res.status(400).json({ error: 'image file is required' });

    const imageBuffer = await fsp.readFile(file.path);
    const { faceMatches, photoIds, collectionName } = await searchFaceInWeddingCollection({ weddingId, imageBuffer, threshold: 70, maxFaces: 20 });

    if (!photoIds.length) return res.json({ data: { success: true, collectionName, count: 0, photos: [] } });

    const photos = await Photo.find({ _id: { $in: photoIds } }).populate('albumId', 'title').populate('uploadedById', 'username email').lean();

    const bestSim = new Map<string, number>();
    for (const m of faceMatches || []) {
      const eid = String(m?.Face?.ExternalImageId || '').trim();
      const sim = Number(m?.Similarity || 0);
      const match = eid.match(/^photo_(.+)$/);
      if (!match) continue;
      const prev = bestSim.get(match[1]) || 0;
      if (sim > prev) bestSim.set(match[1], sim);
    }

    const sorted = [...photos].sort((a: any, b: any) => (bestSim.get(String(b._id)) || 0) - (bestSim.get(String(a._id)) || 0));

    const result = await Promise.all(sorted.map(async (p: any) => {
      const key = String(p.image_url || '').trim();
      return {
        id: p._id, uri: key ? await buildSignedReadUrl(key) : null, key,
        similarity: bestSim.get(String(p._id)) || 0,
        albumId: p.albumId?._id || null, albumTitle: p.albumId?.title || null,
        uploadedBy: p.uploadedById?._id || null, uploadedAt: p.createdAt || null,
        uploadedLabel: formatUploadedLabel(p.createdAt), sizeBytes: toBytes(p.size_bytes),
        fileName: String(p.file_name || ''), face_indexed: !!p.face_indexed,
      };
    }));

    res.json({ data: { success: true, collectionName, count: result.length, photos: result } });
  } catch (err: any) {
    console.error('face.search error', err);
    res.status(500).json({ error: err.message });
  } finally {
    // Always remove the multer-uploaded temp file. Swallow errors —
    // /tmp on most hosts is volatile anyway, and failure to clean up
    // shouldn't bubble up to the client.
    if (file?.path) {
      try { await fsp.unlink(file.path); } catch {}
    }
  }
});

export default router;
