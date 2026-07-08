import "server-only";

import crypto from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  API_TRANSIT_LOGO_BUCKET_HOST,
  API_TRANSIT_LOGO_URL_PREFIX,
} from "@/lib/api-transit-logo-url";

export const API_TRANSIT_LOGO_MAX_BYTES = 512 * 1024;

const API_TRANSIT_LOGO_BINDING = "FEEDBACK_EVIDENCE_BUCKET";
const allowedLogoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);

type ApiTransitLogoBucket = {
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
  get: (key: string) => Promise<ApiTransitLogoObject | null>;
};

type ApiTransitLogoObject = {
  body: ReadableStream;
  size?: number;
  httpMetadata?: {
    contentType?: string;
  };
};

type ApiTransitLogoEnv = CloudflareEnv & {
  FEEDBACK_EVIDENCE_BUCKET?: ApiTransitLogoBucket;
};

export type ApiTransitLogoUploadResult = {
  url: string;
  key: string;
  name: string;
  mimeType: string;
  size: number;
};

export type ApiTransitLogoReadResult = {
  body: ReadableStream;
  contentType: string;
  size?: number;
};

export async function uploadApiTransitLogoImage(
  stationId: string,
  file: File,
): Promise<ApiTransitLogoUploadResult> {
  validateApiTransitLogoImage(file);

  const bucket = await getApiTransitLogoBucket();
  const key = buildApiTransitLogoKey(stationId, file.type);
  const body = await file.arrayBuffer();

  await bucket.put(key, body, {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: `inline; filename="${safeFilename(file.name || "logo")}"`,
    },
    customMetadata: {
      stationId: safeFilename(stationId || "station"),
      originalName: safeFilename(file.name || "logo"),
      uploadedAt: new Date().toISOString(),
    },
  });

  return {
    url: apiTransitLogoReferenceForKey(key),
    key,
    name: file.name || "logo",
    mimeType: file.type,
    size: file.size,
  };
}

export async function readApiTransitLogoImage(reference: string): Promise<ApiTransitLogoReadResult | null> {
  const key = parseApiTransitLogoKey(reference);
  if (!key) return null;

  const bucket = await getApiTransitLogoBucket();
  const object = await bucket.get(key);
  if (!object) return null;

  return {
    body: object.body,
    contentType: object.httpMetadata?.contentType || mimeTypeFromKey(key),
    size: object.size,
  };
}

export function apiTransitLogoReferenceForKey(key: string): string {
  return `${API_TRANSIT_LOGO_URL_PREFIX}${key}`;
}

function validateApiTransitLogoImage(file: File): void {
  if (!allowedLogoTypes.has(file.type)) {
    throw new Error("不支持这种 Logo 格式，请上传 SVG、PNG、JPG 或 WebP。");
  }

  if (file.size <= 0) {
    throw new Error("Logo 文件无效，请重新选择。");
  }

  if (file.size > API_TRANSIT_LOGO_MAX_BYTES) {
    throw new Error("Logo 文件不能超过 512KB。");
  }
}

function parseApiTransitLogoKey(reference: string): string | null {
  if (!reference.startsWith(API_TRANSIT_LOGO_URL_PREFIX)) return null;

  try {
    const parsed = new URL(reference);
    if (parsed.protocol !== "r2:" || parsed.hostname !== API_TRANSIT_LOGO_BUCKET_HOST) return null;

    const key = parsed.pathname.replace(/^\/+/, "");
    if (!/^api-transit-logo\/[a-z0-9][a-z0-9._-]{0,79}\/[0-9a-f-]{36}\.(?:jpg|png|webp|svg)$/i.test(key)) {
      return null;
    }

    return key;
  } catch {
    return null;
  }
}

async function getApiTransitLogoBucket(): Promise<ApiTransitLogoBucket> {
  try {
    const context = await getCloudflareContext({ async: true });
    const bucket = (context.env as ApiTransitLogoEnv)[API_TRANSIT_LOGO_BINDING];
    if (!bucket) throw new Error("Logo 上传暂不可用：R2 存储尚未配置。");
    return bucket;
  } catch (error) {
    if (error instanceof Error && error.message.includes("R2 存储尚未配置")) throw error;
    throw new Error("Logo 上传暂不可用：R2 存储尚未配置。");
  }
}

function buildApiTransitLogoKey(stationId: string, mimeType: string): string {
  const extension = allowedLogoTypes.get(mimeType) || "bin";
  return `api-transit-logo/${safeStationId(stationId)}/${crypto.randomUUID()}.${extension}`;
}

function mimeTypeFromKey(key: string): string {
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".svg")) return "image/svg+xml";
  return "image/png";
}

function safeStationId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "station";
}

function safeFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, "_").slice(0, 120) || "logo";
}
