import "server-only";

import crypto from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  SPONSOR_ASSET_BUCKET_HOST,
  SPONSOR_ASSET_URL_PREFIX,
} from "@/lib/sponsor-asset-url";

export const SPONSOR_ASSET_MAX_BYTES = 2 * 1024 * 1024;

const SPONSOR_ASSET_BINDING = "FEEDBACK_EVIDENCE_BUCKET";
const allowedSponsorAssetTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type SponsorAssetBucket = {
  put: (
    key: string,
    value: ArrayBuffer,
    options?: {
      httpMetadata?: {
        contentType?: string;
        contentDisposition?: string;
      };
      customMetadata?: Record<string, string>;
    },
  ) => Promise<unknown>;
  get: (key: string) => Promise<SponsorAssetObject | null>;
};

type SponsorAssetObject = {
  body: ReadableStream;
  size?: number;
  httpMetadata?: {
    contentType?: string;
  };
};

type SponsorAssetEnv = CloudflareEnv & {
  FEEDBACK_EVIDENCE_BUCKET?: SponsorAssetBucket;
};

export type SponsorAssetUploadResult = {
  url: string;
  key: string;
  name: string;
  mimeType: string;
  size: number;
};

export type SponsorAssetReadResult = {
  body: ReadableStream;
  contentType: string;
  size?: number;
};

export async function uploadSponsorAssetImage(
  placement: string,
  creativeId: string,
  file: File,
): Promise<SponsorAssetUploadResult> {
  validateSponsorAssetImage(file);

  const bucket = await getSponsorAssetBucket();
  const key = buildSponsorAssetKey(placement, creativeId, file.type);
  const body = await file.arrayBuffer();

  await bucket.put(key, body, {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: `inline; filename="${safeFilename(file.name || "sponsor")}"`,
    },
    customMetadata: {
      placement: safeFilename(placement || "placement"),
      creativeId: safeFilename(creativeId || "creative"),
      originalName: safeFilename(file.name || "sponsor"),
      uploadedAt: new Date().toISOString(),
    },
  });

  return {
    url: sponsorAssetReferenceForKey(key),
    key,
    name: file.name || "sponsor",
    mimeType: file.type,
    size: file.size,
  };
}

export async function readSponsorAssetImage(reference: string): Promise<SponsorAssetReadResult | null> {
  const key = parseSponsorAssetKey(reference);
  if (!key) return null;

  const bucket = await getSponsorAssetBucket();
  const object = await bucket.get(key);
  if (!object) return null;

  return {
    body: object.body,
    contentType: object.httpMetadata?.contentType || mimeTypeFromKey(key),
    size: object.size,
  };
}

export function isSponsorAssetReference(value: string): boolean {
  return Boolean(parseSponsorAssetKey(value));
}

export function sponsorAssetReferenceForKey(key: string): string {
  return `${SPONSOR_ASSET_URL_PREFIX}${key}`;
}

function validateSponsorAssetImage(file: File): void {
  if (!allowedSponsorAssetTypes.has(file.type)) {
    throw new Error("不支持这种赞助图片格式，请上传 PNG、JPG 或 WebP。");
  }

  if (file.size <= 0) {
    throw new Error("赞助图片文件无效，请重新选择。");
  }

  if (file.size > SPONSOR_ASSET_MAX_BYTES) {
    throw new Error("赞助图片不能超过 2MB。");
  }
}

function parseSponsorAssetKey(reference: string): string | null {
  if (!reference.startsWith(SPONSOR_ASSET_URL_PREFIX)) return null;

  try {
    const parsed = new URL(reference);
    if (parsed.protocol !== "r2:" || parsed.hostname !== SPONSOR_ASSET_BUCKET_HOST) return null;

    const key = parsed.pathname.replace(/^\/+/, "");
    if (!/^sponsor-assets\/[a-z0-9_-]{1,40}\/[a-z0-9][a-z0-9._-]{0,79}\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(key)) {
      return null;
    }

    return key;
  } catch {
    return null;
  }
}

async function getSponsorAssetBucket(): Promise<SponsorAssetBucket> {
  try {
    const context = await getCloudflareContext({ async: true });
    const bucket = (context.env as SponsorAssetEnv)[SPONSOR_ASSET_BINDING];
    if (!bucket) throw new Error("赞助图片上传暂不可用：R2 存储尚未配置。");
    return bucket;
  } catch (error) {
    if (error instanceof Error && error.message.includes("R2 存储尚未配置")) throw error;
    throw new Error("赞助图片上传暂不可用：R2 存储尚未配置。");
  }
}

function buildSponsorAssetKey(placement: string, creativeId: string, mimeType: string): string {
  const extension = allowedSponsorAssetTypes.get(mimeType) || "bin";
  return `sponsor-assets/${safePathPart(placement, "placement")}/${safePathPart(creativeId, "creative")}/${crypto.randomUUID()}.${extension}`;
}

function mimeTypeFromKey(key: string): string {
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  return "image/png";
}

function safePathPart(value: string, fallback: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || fallback;
}

function safeFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, "_").slice(0, 120) || "sponsor";
}
