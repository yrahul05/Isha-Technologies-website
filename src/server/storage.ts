import 'server-only';
import { mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { fileChunks } from '@/server/db/schema';

/**
 * ─── StorageProvider ─────────────────────────────────────────────────────
 *
 * Private file storage behind one interface, selected by STORAGE_DRIVER
 * (or auto-detected). Files never live in the source tree or the public
 * folder, and no provider exposes a predictable public URL: every read goes
 * through /api/portal/documents/:id/download after an authorisation check.
 *
 *   database     Postgres (file_chunks, ≤ 4 MB chunks). Default in
 *                production when nothing else is configured — needs no new
 *                service, and files are backed up with the database.
 *   vercel-blob  Vercel Blob, private store (BLOB_READ_WRITE_TOKEN). Browser
 *                uploads with a single-use client token scoped to one path,
 *                content type and size; downloads via 60 s presigned URL.
 *   s3           Any S3-compatible bucket (S3_BUCKET …): presigned PUT/GET.
 *   local        Disk outside the repo (LOCAL_UPLOAD_DIR, default .data/),
 *                for development or a self-hosted server.
 *
 * Adding a provider = implementing this interface; nothing else changes.
 */
export type StorageName = 'database' | 'vercel-blob' | 's3' | 'local';

export type UploadPlan =
  | { mode: 'proxy'; partSize: number } // chunked PUTs to /api/portal/uploads/:id
  | { mode: 'presigned'; url: string; headers: Record<string, string> }
  | { mode: 'blob-client'; pathname: string; clientToken: string; contentType: string };

export type DownloadResult = { redirect: string } | { body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>; size: number };

export interface StorageProvider {
  readonly name: StorageName;
  prepareUpload(key: string, mime: string, size: number): Promise<UploadPlan>;
  /** Proxy mode only: store one part (≤ PART_SIZE). */
  putPart?(key: string, index: number, data: Buffer): Promise<void>;
  /** Proxy mode only: assemble parts 0..count-1. */
  completeParts?(key: string, count: number): Promise<void>;
  /** Server-side single write (avatars, generated files). */
  putObject(key: string, data: Buffer, mime: string): Promise<void>;
  inspect(key: string): Promise<{ size: number; head: Buffer } | null>;
  readAll(key: string, maxBytes: number): Promise<Buffer | null>;
  download(key: string, fileName: string, mime: string, inline: boolean): Promise<DownloadResult | null>;
  delete(key: string): Promise<void>;
}

/** Vercel functions accept ≤ 4.5 MB request bodies — proxy uploads are chunked below that. */
export const PART_SIZE = 4 * 1024 * 1024;

const disposition = (fileName: string, inline: boolean) => `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(fileName)}`;

// ─── database ────────────────────────────────────────────────────────────
const databaseProvider: StorageProvider = {
  name: 'database',
  async prepareUpload() {
    return { mode: 'proxy', partSize: PART_SIZE };
  },
  async putPart(key, index, data) {
    await db.insert(fileChunks).values({ key, part: index, data }).onConflictDoUpdate({ target: [fileChunks.key, fileChunks.part], set: { data } });
  },
  async completeParts(key, count) {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(fileChunks).where(eq(fileChunks.key, key));
    if ((row?.n ?? 0) !== count) throw new Error('Upload incomplete');
  },
  async putObject(key, data) {
    await db.delete(fileChunks).where(eq(fileChunks.key, key));
    for (let i = 0, part = 0; i < data.length || part === 0; i += PART_SIZE, part++) {
      await db.insert(fileChunks).values({ key, part, data: data.subarray(i, i + PART_SIZE) });
      if (i + PART_SIZE >= data.length) break;
    }
  },
  async inspect(key) {
    const [meta] = await db.select({ size: sql<number>`coalesce(sum(length(${fileChunks.data})), 0)::bigint`, n: sql<number>`count(*)::int` }).from(fileChunks).where(eq(fileChunks.key, key));
    if (!meta?.n) return null;
    const [first] = await db.select({ data: fileChunks.data }).from(fileChunks).where(and(eq(fileChunks.key, key), eq(fileChunks.part, 0)));
    return { size: Number(meta.size), head: Buffer.from(first.data.subarray(0, 64)) };
  },
  async readAll(key, maxBytes) {
    const parts = await db.select({ data: fileChunks.data }).from(fileChunks).where(eq(fileChunks.key, key)).orderBy(asc(fileChunks.part));
    if (!parts.length) return null;
    const buf = Buffer.concat(parts.map((p) => p.data));
    return buf.length > maxBytes ? null : buf;
  },
  async download(key) {
    const [meta] = await db.select({ size: sql<number>`coalesce(sum(length(${fileChunks.data})), 0)::bigint`, n: sql<number>`count(*)::int` }).from(fileChunks).where(eq(fileChunks.key, key));
    if (!meta?.n) return null;
    // Stream chunk by chunk so large files never sit in memory at once.
    let part = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const [row] = await db.select({ data: fileChunks.data }).from(fileChunks).where(and(eq(fileChunks.key, key), eq(fileChunks.part, part)));
        if (!row) return controller.close();
        controller.enqueue(new Uint8Array(row.data));
        part += 1;
      },
    });
    return { body, size: Number(meta.size) };
  },
  async delete(key) {
    await db.delete(fileChunks).where(eq(fileChunks.key, key));
  },
};

// ─── local disk ──────────────────────────────────────────────────────────
const LOCAL_ROOT = path.resolve(process.env.LOCAL_UPLOAD_DIR || '.data/uploads');
function localPath(key: string): string {
  const full = path.resolve(LOCAL_ROOT, key);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error('Invalid storage key'); // no traversal
  return full;
}
const localProvider: StorageProvider = {
  name: 'local',
  async prepareUpload() {
    return { mode: 'proxy', partSize: PART_SIZE };
  },
  async putPart(key, index, data) {
    const file = `${localPath(key)}.part${index}`;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  },
  async completeParts(key, count) {
    const target = localPath(key);
    const handle = await open(target, 'wx'); // never overwrite an existing object
    try {
      for (let i = 0; i < count; i++) {
        await handle.write(await readFile(`${target}.part${i}`));
        await rm(`${target}.part${i}`, { force: true });
      }
    } finally {
      await handle.close();
    }
  },
  async putObject(key, data) {
    const file = localPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  },
  async inspect(key) {
    try {
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
  },
  async readAll(key, maxBytes) {
    const info = await stat(localPath(key)).catch(() => null);
    if (!info || info.size > maxBytes) return null;
    return readFile(localPath(key));
  },
  async download(key) {
    const bytes = await readFile(localPath(key)).catch(() => null);
    return bytes ? { body: new Uint8Array(bytes), size: bytes.length } : null;
  },
  async delete(key) {
    await rm(localPath(key), { force: true });
  },
};

// ─── S3-compatible ───────────────────────────────────────────────────────
let s3client: S3Client | undefined;
function s3(): S3Client {
  return (s3client ??= new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === '1',
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } : undefined,
  }));
}
const bucket = () => process.env.S3_BUCKET!;
const sse = () => (process.env.S3_SSE === 'none' ? undefined : ('AES256' as const));
async function streamToBuffer(stream: ReadableStream<Uint8Array>, max: number): Promise<Buffer | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
async function firstBytes(stream: ReadableStream<Uint8Array>, n: number): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < n) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => undefined);
  return Buffer.concat(chunks).subarray(0, n);
}
const s3Provider: StorageProvider = {
  name: 's3',
  async prepareUpload(key, mime, size) {
    const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: mime, ContentLength: size, ServerSideEncryption: sse() }), {
      expiresIn: 600,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
    const headers: Record<string, string> = { 'Content-Type': mime };
    if (sse()) headers['x-amz-server-side-encryption'] = 'AES256';
    return { mode: 'presigned', url, headers };
  },
  async putObject(key, data, mime) {
    await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: data, ContentType: mime, ServerSideEncryption: sse() }));
  },
  async inspect(key) {
    try {
      const meta = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
      const obj = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: 'bytes=0-63' }));
      return { size: Number(meta.ContentLength ?? 0), head: Buffer.from(await obj.Body!.transformToByteArray()) };
    } catch {
      return null;
    }
  },
  async readAll(key, maxBytes) {
    const obj = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key })).catch(() => null);
    return obj?.Body ? streamToBuffer(obj.Body.transformToWebStream() as ReadableStream<Uint8Array>, maxBytes) : null;
  },
  async download(key, fileName, mime, inline) {
    const url = await getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: disposition(fileName, inline), ResponseContentType: mime }), { expiresIn: 60 });
    return { redirect: url };
  },
  async delete(key) {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  },
};

// ─── Vercel Blob (private) ───────────────────────────────────────────────
const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN!;
const vercelBlobProvider: StorageProvider = {
  name: 'vercel-blob',
  async prepareUpload(key, mime, size) {
    const { generateClientTokenFromReadWriteToken } = await import('@vercel/blob/client');
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: blobToken(),
      pathname: key,
      allowedContentTypes: [mime],
      maximumSizeInBytes: size,
      validUntil: Date.now() + 10 * 60 * 1000,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return { mode: 'blob-client', pathname: key, clientToken, contentType: mime };
  },
  async putObject(key, data, mime) {
    const { put } = await import('@vercel/blob');
    await put(key, data, { access: 'private', token: blobToken(), contentType: mime, addRandomSuffix: false, allowOverwrite: true });
  },
  async inspect(key) {
    try {
      const { head, get } = await import('@vercel/blob');
      const meta = await head(key, { token: blobToken() });
      const res = await get(key, { access: 'private', token: blobToken(), useCache: false });
      if (!res || res.statusCode !== 200) return null;
      return { size: meta.size, head: await firstBytes(res.stream, 64) };
    } catch {
      return null;
    }
  },
  async readAll(key, maxBytes) {
    const { get } = await import('@vercel/blob');
    const res = await get(key, { access: 'private', token: blobToken(), useCache: false }).catch(() => null);
    return res && res.statusCode === 200 ? streamToBuffer(res.stream, maxBytes) : null;
  },
  async download(key) {
    // Stream through the (already authorised) route; the private blob URL is never exposed.
    const { get } = await import('@vercel/blob');
    const res = await get(key, { access: 'private', token: blobToken(), useCache: false }).catch(() => null);
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, size: res.blob.size };
  },
  async delete(key) {
    const { del } = await import('@vercel/blob');
    await del(key, { token: blobToken() });
  },
};

const PROVIDERS: Record<StorageName, StorageProvider> = { database: databaseProvider, local: localProvider, s3: s3Provider, 'vercel-blob': vercelBlobProvider };

/** The provider new files go to. Existing files are always read with the provider recorded on their version. */
export function storageDriver(): StorageName {
  const explicit = process.env.STORAGE_DRIVER as StorageName | undefined;
  if (explicit && explicit in PROVIDERS) return explicit;
  if (process.env.S3_BUCKET) return 's3';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'vercel-blob';
  return process.env.NODE_ENV === 'production' ? 'database' : 'local';
}

export function storage(name: string = storageDriver()): StorageProvider {
  return PROVIDERS[(name in PROVIDERS ? name : 'local') as StorageName];
}

export const STORAGE_LABELS: Record<StorageName, string> = {
  database: 'PostgreSQL (private, backed up with the database)',
  'vercel-blob': 'Vercel Blob — private store',
  s3: 'S3-compatible bucket',
  local: 'Local disk (development / self-hosted)',
};
