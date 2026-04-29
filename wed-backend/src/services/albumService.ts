import { Album } from '../models/Album';
import { Photo } from '../models/Photo';
import { buildSignedReadUrls, deleteS3Object } from '../config/s3';

/**
 * Side-effect-free album operations used by routes/album.ts. Pulling these
 * out keeps the route layer focused on auth + request shape and gives a
 * single chokepoint for the album-list aggregation + S3 cleanup logic.
 */

export type AlbumWithCover = {
  _id: any;
  title: string;
  systemKey?: string | null;
  isDefault?: boolean;
  hidden?: boolean;
  deletedByUser?: boolean;
  weddingId: string;
  coverUrl: string | null;
  photoCount: number;
};

/**
 * Fetch all visible albums for a wedding with their cover thumbnail and
 * photo count via one aggregation, then sign the cover URLs in a single
 * batch (see config/s3.buildSignedReadUrls).
 */
export async function listAlbumsWithCovers(weddingId: string): Promise<AlbumWithCover[]> {
  const albums = await Album.aggregate([
    { $match: { weddingId, hidden: { $ne: true }, deletedByUser: { $ne: true } } },
    { $sort: { createdAt: 1 } },
    { $limit: 200 },
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
      $addFields: {
        coverImageUrl: { $ifNull: [{ $arrayElemAt: ['$cover.image_url', 0] }, null] },
        photoCount: { $ifNull: [{ $arrayElemAt: ['$countAgg.n', 0] }, 0] },
      },
    },
    { $project: { cover: 0, countAgg: 0 } },
  ]);

  const coverUrls = await buildSignedReadUrls(albums.map((a: any) => a.coverImageUrl));
  return albums.map((album: any, i: number) => {
    const { coverImageUrl: _drop, ...rest } = album;
    return { ...rest, coverUrl: coverUrls[i] } as AlbumWithCover;
  });
}

/**
 * Hard-delete an album: removes every photo's S3 object, the photo rows, and
 * the album row. Returns total bytes freed and the count of photos removed.
 * Default / system albums are NOT deleted by this function — soft-delete
 * those in the route handler.
 */
export async function hardDeleteAlbum(albumId: any): Promise<{ deletedPhotos: number; freedBytes: number }> {
  const photos = await Photo.find({ albumId }).select('size_bytes image_url').lean();
  let freedBytes = 0;
  for (const p of photos) freedBytes += Number(p.size_bytes || 0);

  // Settle-all so a single missing S3 object can't kill the cleanup loop.
  await Promise.allSettled(
    photos
      .map((p) => String(p.image_url || '').trim())
      .filter(Boolean)
      .map((key) => deleteS3Object(key))
  );

  await Photo.deleteMany({ albumId });
  await Album.findByIdAndDelete(albumId);

  return { deletedPhotos: photos.length, freedBytes };
}
