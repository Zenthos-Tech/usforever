import { Album } from '../models/Album';
import { Photo } from '../models/Photo';
import { buildSignedReadUrl } from '../config/s3';

export async function listAlbums({ weddingId }: { weddingId: string }) {
  if (!weddingId) return { weddingId, albums: [] };

  const albums = await Album.find({ weddingId, hidden: { $ne: true }, deletedByUser: { $ne: true } })
    .select('title systemKey _id')
    .lean();

  const result = await Promise.all(
    albums.map(async (album) => {
      const event = (album as any).title;
      const albumId = String((album as any)._id);

      const coverPhoto = await Photo.findOne({ albumId: (album as any)._id })
        .sort({ createdAt: -1 })
        .select('image_url')
        .lean();

      let coverUrl = null;
      if (coverPhoto?.image_url) {
        try { coverUrl = await buildSignedReadUrl(String(coverPhoto.image_url)); } catch {}
      }

      const photoCount = await Photo.countDocuments({ albumId: (album as any)._id });

      return { event, albumId, coverUrl, photoCount };
    })
  );

  return { weddingId, albums: result };
}

export async function listImages({ weddingId, event, limit, nextToken }: { weddingId: string; event: string; limit: number; nextToken?: string }) {
  if (!weddingId) throw new Error('Missing weddingId');
  if (!event) throw new Error('Missing event');

  // Match album by title (case-insensitive) scoped to this wedding
  const album = await Album.findOne({
    weddingId,
    title: { $regex: new RegExp(`^${event.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    hidden: { $ne: true },
    deletedByUser: { $ne: true },
  }).lean();

  if (!album) return { weddingId, event, count: 0, nextToken: null, images: [] };

  const skip = nextToken ? parseInt(nextToken, 10) : 0;
  const safeLimit = Math.max(1, Math.min(limit, 200));

  const photos = await Photo.find({ albumId: (album as any)._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit)
    .select('image_url _id')
    .lean();

  const images = await Promise.all(
    photos.map(async (p) => ({
      key: p.image_url,
      photoId: String(p._id),
      url: await buildSignedReadUrl(String(p.image_url)),
    }))
  );

  const totalCount = await Photo.countDocuments({ albumId: (album as any)._id });
  const newSkip = skip + photos.length;

  return {
    weddingId, event, count: images.length,
    nextToken: newSkip < totalCount ? String(newSkip) : null,
    images,
  };
}
