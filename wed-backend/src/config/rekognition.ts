import {
  RekognitionClient,
  CreateCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
} from '@aws-sdk/client-rekognition';
import crypto from 'crypto';
import { env } from './env';
import { Wedding } from '../models/Wedding';
import { Photo } from '../models/Photo';

// AWS SDK v3 Rekognition client. Replaces the legacy `aws-sdk` v2
// `AWS.Rekognition` so the backend ships only one AWS SDK family.
const rekognition = new RekognitionClient({
  region: env.AWS_REGION,
  credentials:
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

const normalizePhone = (v: any) => String(v ?? '').replace(/[^\d]/g, '').trim();
// 6-char random suffix for the Rekognition collection name. Using a CSPRNG
// here so two concurrent creates for the same wedding cannot land on the same
// suffix (still rare with Math.random, but CSPRNG removes the worry entirely).
const randomSuffix = () => crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();

export const buildCollectionName = (wedding: { _id: any; phone: string }) => {
  const phone = normalizePhone(wedding.phone);
  if (!phone || !wedding._id) throw new Error('Cannot build collection name without wedding id and phone');
  return `${phone}_${wedding._id}_${randomSuffix()}`;
};

export const ensureWeddingCollection = async (weddingId: string): Promise<string> => {
  const wedding = await Wedding.findById(weddingId).select('phone collection_name').lean();
  if (!wedding) throw new Error(`Wedding ${weddingId} not found`);

  const existing = (wedding.collection_name || '').trim();
  if (existing) return existing;

  const collectionName = buildCollectionName(wedding as any);

  try {
    await rekognition.send(new CreateCollectionCommand({ CollectionId: collectionName }));
  } catch (err: any) {
    // v3 surfaces error codes via err.name (was err.code in v2).
    if (err?.name !== 'ResourceAlreadyExistsException' && err?.code !== 'ResourceAlreadyExistsException') {
      throw err;
    }
  }

  await Wedding.findByIdAndUpdate(weddingId, { collection_name: collectionName });
  return collectionName;
};

export const indexPhotoIntoCollection = async (params: {
  photoId: string; imageKey: string; weddingId: string;
}) => {
  const { photoId, imageKey, weddingId } = params;
  if (!photoId || !imageKey || !weddingId) throw new Error('photoId, imageKey and weddingId are required');

  const collectionName = await ensureWeddingCollection(weddingId);
  const externalImageId = `photo_${photoId}`;

  const result = await rekognition.send(
    new IndexFacesCommand({
      CollectionId: collectionName,
      Image: { S3Object: { Bucket: env.AWS_BUCKET, Name: imageKey } },
      ExternalImageId: externalImageId,
      MaxFaces: 10,
      QualityFilter: 'AUTO',
      DetectionAttributes: [],
    })
  );

  const indexedCount = Array.isArray(result.FaceRecords) ? result.FaceRecords.length : 0;

  console.log('Rekognition indexFaces result', { photoId, weddingId, collectionName, indexedCount });

  await Photo.findByIdAndUpdate(photoId, {
    face_indexed: indexedCount > 0,
    face_external_id: indexedCount > 0 ? externalImageId : null,
    rek_collection: indexedCount > 0 ? collectionName : null,
  });

  return { collectionName, externalImageId, indexedCount, faceRecords: result.FaceRecords || [], unindexedFaces: result.UnindexedFaces || [] };
};

export const searchFaceInWeddingCollection = async (params: {
  weddingId: string; imageBuffer: Buffer; threshold?: number; maxFaces?: number;
}) => {
  const { weddingId, imageBuffer, threshold = 85, maxFaces = 50 } = params;
  if (!weddingId) throw new Error('weddingId is required');
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) throw new Error('imageBuffer is required');

  const wedding = await Wedding.findById(weddingId).select('collection_name').lean();
  if (!wedding) throw new Error(`Wedding ${weddingId} not found`);

  let collectionName = (wedding.collection_name || '').trim();
  if (!collectionName) collectionName = await ensureWeddingCollection(weddingId);

  const result = await rekognition.send(
    new SearchFacesByImageCommand({
      CollectionId: collectionName,
      Image: { Bytes: imageBuffer },
      FaceMatchThreshold: threshold,
      MaxFaces: maxFaces,
      QualityFilter: 'AUTO',
    })
  );

  const photoIds = Array.from(new Set(
    (result.FaceMatches || [])
      .map((m) => String(m.Face?.ExternalImageId || '').trim())
      .filter(Boolean)
      .map((v) => { const match = v.match(/^photo_(.+)$/); return match ? match[1] : null; })
      .filter((n): n is string => !!n)
  ));

  return { collectionName, faceMatches: result.FaceMatches || [], photoIds };
};
