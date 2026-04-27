import AWS from 'aws-sdk';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

const READ_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Legacy AWS SDK S3 client (used for presign + delete)
export const s3Legacy = new AWS.S3({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION,
  signatureVersion: 'v4',
});

// AWS SDK v3 S3 client (used for TV media listing)
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
  return s3Legacy.getSignedUrlPromise('getObject', {
    Bucket: env.AWS_BUCKET,
    Key: key,
    Expires: READ_URL_EXPIRES_SECONDS,
  });
}

export async function buildSignedPutUrl(key: string, contentType: string): Promise<string> {
  return s3Legacy.getSignedUrlPromise('putObject', {
    Bucket: env.AWS_BUCKET,
    Key: key,
    ContentType: contentType,
  });
}

export async function deleteS3Object(key: string): Promise<void> {
  await s3Legacy.deleteObject({ Bucket: env.AWS_BUCKET, Key: key }).promise();
}

export async function presignV3(key: string, bucket: string, expiresIn: number): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3v3, cmd, { expiresIn });
}

export { ListObjectsV2Command, GetObjectCommand };
