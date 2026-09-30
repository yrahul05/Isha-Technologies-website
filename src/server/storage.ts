import 'server-only';
import { mkdir, readFile, stat, open } from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Private file storage.
 *
 *  s3    → any S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, Wasabi).
 *          The bucket must block all public access. Browsers upload straight
 *          to the bucket with a short-lived presigned PUT (bypassing Vercel's
 *          4.5 MB request limit) and download with a 60-second presigned GET
 *          issued only after the portal's authorisation check.
 *  local → files under .data/uploads for development. Never used in
 *          production (Vercel's filesystem is ephemeral and read-only).
 */
export type StorageDriver = 's3' | 'local' | 'none';

export function storageDriver(): StorageDriver {
  if (process.env.S3_BUCKET) return 's3';
  return process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_STORAGE_IN_PRODUCTION !== '1' ? 'none' : 'local';
}

const LOCAL_ROOT = path.resolve(process.env.LOCAL_UPLOAD_DIR || '.data/uploads');

let client: S3Client | undefined;
function s3(): S3Client {
  return (client ??= new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === '1',
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined,
  }));
}
const bucket = () => process.env.S3_BUCKET!;

function localPath(key: string): string {
  const full = path.resolve(LOCAL_ROOT, key);
  // Keys are generated server-side, but never allow traversal regardless.
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error('Invalid storage key');
  return full;
}

export async function presignUpload(key: string, contentType: string, size: number): Promise<{ url: string; headers: Record<string, string> } | null> {
  if (storageDriver() !== 's3') return null;
  const command = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ContentLength: size, ServerSideEncryption: process.env.S3_SSE === 'none' ? undefined : 'AES256' });
  const url = await getSignedUrl(s3(), command, { expiresIn: 600, signableHeaders: new Set(['content-type', 'content-length']) });
  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (process.env.S3_SSE !== 'none') headers['x-amz-server-side-encryption'] = 'AES256';
  return { url, headers };
}

export async function writeLocal(key: string, data: Buffer): Promise<void> {
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  const handle = await open(file, 'wx'); // never overwrite an existing object
  try {
    await handle.writeFile(data);
  } finally {
    await handle.close();
  }
}

/** Size + first bytes of a stored object, for post-upload verification. */
export async function inspectObject(key: string): Promise<{ size: number; head: Buffer } | null> {
  try {
    if (storageDriver() === 's3') {
      const meta = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
      const obj = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: 'bytes=0-63' }));
      const head = Buffer.from(await obj.Body!.transformToByteArray());
      return { size: Number(meta.ContentLength ?? 0), head };
    }
    const file = localPath(key);
    const info = await stat(file);
    const handle = await open(file, 'r');
    try {
      const buf = Buffer.alloc(64);
      const { bytesRead } = await handle.read(buf, 0, 64, 0);
      return { size: info.size, head: buf.subarray(0, bytesRead) };
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

export async function presignDownload(key: string, fileName: string, contentType: string, inline: boolean): Promise<string> {
  const disposition = `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: disposition, ResponseContentType: contentType }), { expiresIn: 60 });
}

export async function readLocal(key: string): Promise<Buffer> {
  return readFile(localPath(key));
}
