import { Album } from '../models/Album';
import { Photo } from '../models/Photo';
import { buildSignedReadUrl } from '../config/s3';

export async function listAlbums({ weddingId }: { weddingId: string }) {
  if (!weddingId) return { weddingId, albums: [] };

  // Single aggregation for cover + count, then sign URLs application-side.
  const albums = await Album.aggregate([
    { $match: { weddingId, hidden: { $ne: true }, deletedByUser: { $ne: true } } },
    {
      $lookup: {
        from: Photo.collection.name,
        let: { aid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$albumId', '$$aid'] } } },
          { $sort: { createdAt: -1, _id: -1 } },
          { $limit: 1 },
          { $project: { image_url: 1 } },
        ],
        as: 'cover',
      },
    },
    {
      $lookup: {
        from: Photo.collection.name,
        let: { aid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$albumId', '$$aid'] } } },
          { $count: 'n' },
        ],
        as: 'countAgg',
      },
    },
    {
      $project: {
        title: 1,
        systemKey: 1,
        coverImageUrl: { $ifNull: [{ $arrayElemAt: ['$cover.image_url', 0] }, null] },
        photoCount: { $ifNull: [{ $arrayElemAt: ['$countAgg.n', 0] }, 0] },
      },
    },
  ]);

  const result = await Promise.all(
    albums.map(async (album: any) => {
      let coverUrl: string | null = null;
      if (album.coverImageUrl) {
        try { coverUrl = await buildSignedReadUrl(String(album.coverImageUrl)); } catch {}
      }
      return {
        event: album.title,
        albumId: String(album._id),
        coverUrl,
        photoCount: album.photoCount,
      };
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
