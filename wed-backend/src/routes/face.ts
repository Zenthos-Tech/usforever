import { Router, Request, Response } from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { searchFaceInWeddingCollection } from '../config/rekognition';
import { buildSignedReadUrl } from '../config/s3';
import { Photo } from '../models/Photo';
import { User } from '../models/User';
import { Wedding } from '../models/Wedding';
import { toBytes, formatUploadedLabel } from '../utils/helpers';

const router = Router();

/**
 * Verify the bearer token and return the weddingId the caller is authorised
 * for. Accepts:
 *   • a User JWT (signed with JWT_SECRET) — couple flow
 *   • a share-access JWT (signed with PHOTOGRAPHER_JWT_SECRET, typ=share-access
 *     or photographer-share-access) — guest / photographer flow
 */
async function authoriseFaceSearch(
  bearer: string,
  requestedWeddingId: string
): Promise<{ ok: true; weddingId: string } | { ok: false; status: number; error: string }> {
  if (!bearer) return { ok: false, status: 401, error: 'Missing Authorization header' };

  // Try user JWT first.
  try {
    const decoded = jwt.verify(bearer, env.JWT_SECRET) as any;
    if (decoded?.id) {
      const user = await User.findById(decoded.id).select('contact_no').lean();
      if (!user || !user.contact_no) return { ok: false, status: 403, error: 'Forbidden' };
      const wedding = await Wedding.findOne({ phone: user.contact_no }).select('_id').lean();
      if (!wedding) return { ok: false, status: 404, error: 'Wedding not found' };
      const wid = String(wedding._id);
      if (requestedWeddingId && requestedWeddingId !== wid) {
        return { ok: false, status: 403, error: 'Forbidden' };
      }
      return { ok: true, weddingId: wid };
    }
  } catch {
    // Fall through to share-access JWT.
  }

  // Try share-access JWT.
  if (env.PHOTOGRAPHER_JWT_SECRET) {
    try {
      const decoded = jwt.verify(bearer, env.PHOTOGRAPHER_JWT_SECRET) as any;
      const validTyp = decoded?.typ === 'share-access' || decoded?.typ === 'photographer-share-access';
      if (validTyp && decoded?.weddingId) {
        const wid = String(decoded.weddingId);
        if (requestedWeddingId && requestedWeddingId !== wid) {
          return { ok: false, status: 403, error: 'Forbidden' };
        }
        return { ok: true, weddingId: wid };
      }
    } catch {
      // fall through
    }
  }

  return { ok: false, status: 401, error: 'Invalid token' };
}

router.post('/search', async (req: Request, res: Response) => {
  const file = (req as any).file;
  try {
    const requestedWeddingId = String(req.body?.weddingId || '').trim();
    if (!requestedWeddingId) return res.status(400).json({ error: 'weddingId is required' });

    const hdr = String(req.headers.authorization || '').trim();
    const bearer = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : '';
    const auth = await authoriseFaceSearch(bearer, requestedWeddingId);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    const weddingId = auth.weddingId;

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
    if (file?.path) {
      try { await fs.promises.unlink(file.path); } catch {}
    }
  }
});

export default router;
