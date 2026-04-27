import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

const READ_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Single AWS SDK v3 S3 client. Used for presign (read + write), delete, head,
// and listing. The legacy v2 `aws-sdk` client and the second v3 instance have
// been collapsed into this one — see `aws-sdk` removed from package.json.
export const s3v3 = new S3Client({
  region: env.AWS_REGION,
  credentials:
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export async function buildSignedReadUrl(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key });
  return getSignedUrl(s3v3, cmd, { expiresIn: READ_URL_EXPIRES_SECONDS });
}

export async function buildSignedPutUrl(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.AWS_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  // Default presign URL expiry from `getSignedUrl` is 15 minutes — fine for an
  // upload window. Keep callers explicit if they need longer.
  return getSignedUrl(s3v3, cmd);
}

export async function deleteS3Object(key: string): Promise<void> {
  await s3v3.send(new DeleteObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }));
}

/**
 * Returns the byte length of an S3 object. Used by /api/photos/sync-sizes to
 * back-fill rows whose `size_bytes` is 0/missing.
 */
export async function headS3Object(key: string): Promise<{ contentLength: number }> {
  const out = await s3v3.send(new HeadObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }));
  return { contentLength: Number(out.ContentLength || 0) };
}

export async function presignV3(key: string, bucket: string, expiresIn: number): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3v3, cmd, { expiresIn });
}

export { ListObjectsV2Command, GetObjectCommand };
