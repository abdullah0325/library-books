import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "library-books";
const R2_ENDPOINT =
  process.env.R2_ENDPOINT ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");

let cachedS3Client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_ACCESS_KEY_ID.trim().length > 0 &&
    R2_SECRET_ACCESS_KEY.trim().length > 0 &&
    R2_ENDPOINT &&
    R2_ENDPOINT.trim().length > 0
  );
}

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    return null;
  }
  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return cachedS3Client;
}

export const BUCKET_NAME = R2_BUCKET_NAME;

// Local fallback storage directory
function getLocalStorageDir(): string {
  let storageDir = path.join(process.cwd(), "data", "storage");
  try {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    return storageDir;
  } catch {
    storageDir = path.join("/tmp", "kitabkhana_storage");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    return storageDir;
  }
}

/**
 * Upload a file buffer to Cloudflare R2, with local cache fallback
 */
export async function uploadToR2(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<{ key: string; url?: string }> {
  // Always save a local copy for resilient instant access
  try {
    const storageDir = getLocalStorageDir();
    const localFilePath = path.join(storageDir, params.key.replace(/\//g, "_"));
    fs.writeFileSync(localFilePath, Buffer.from(params.body as any));
  } catch (err) {
    console.warn("Could not write local storage cache:", err);
  }

  const client = getR2Client();
  if (!client) {
    // Cloudflare R2 not configured in environment; local file storage is active
    return { key: params.key };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata,
    });

    await client.send(command);
    return { key: params.key };
  } catch (error) {
    console.warn("R2 upload error for key:", params.key, error);
    // Return key anyway since local file cache is saved
    return { key: params.key };
  }
}

/**
 * Generate a temporary signed URL for secure reading or downloading
 */
export async function getSignedR2Url(
  key: string,
  expiresInSeconds: number = 900,
  downloadFilename?: string
): Promise<string> {
  const client = getR2Client();
  if (!client) {
    throw new Error("R2 is not configured; use local streaming endpoint.");
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ...(downloadFilename
      ? {
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(
            downloadFilename
          )}"`,
        }
      : {}),
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Fetch object stream from R2 or local storage
 */
export async function getObjectFromR2(key: string) {
  const client = getR2Client();
  if (client) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      return await client.send(command);
    } catch (err) {
      console.warn("Failed fetching from R2 cloud, falling back to local storage:", err);
    }
  }

  // Fallback to local storage
  const storageDir = getLocalStorageDir();
  const localFilePath = path.join(storageDir, key.replace(/\//g, "_"));
  if (fs.existsSync(localFilePath)) {
    const stream = fs.createReadStream(localFilePath);
    return { Body: stream as any };
  }

  throw new Error(`File with key ${key} not found in storage.`);
}

/**
 * Test R2 connectivity safely
 */
export async function testR2Connection(): Promise<{
  connected: boolean;
  bucket: string;
  endpoint: string;
  error?: string;
}> {
  if (!isR2Configured()) {
    return {
      connected: false,
      bucket: BUCKET_NAME,
      endpoint: R2_ENDPOINT || "Not set",
      error: "Cloudflare R2 credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) not provided. Operating seamlessly with local storage.",
    };
  }

  const client = getR2Client();
  if (!client) {
    return {
      connected: false,
      bucket: BUCKET_NAME,
      endpoint: R2_ENDPOINT,
      error: "Could not initialize S3 Client.",
    };
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    return {
      connected: true,
      bucket: BUCKET_NAME,
      endpoint: R2_ENDPOINT,
    };
  } catch (err: any) {
    try {
      await client.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME, MaxKeys: 1 }));
      return {
        connected: true,
        bucket: BUCKET_NAME,
        endpoint: R2_ENDPOINT,
      };
    } catch (innerErr: any) {
      return {
        connected: false,
        bucket: BUCKET_NAME,
        endpoint: R2_ENDPOINT,
        error: innerErr.message || String(innerErr),
      };
    }
  }
}
