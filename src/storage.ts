// 图片对象存储：用 Supabase Storage 替代 R2（免费、无需绑卡）。
// 上传/下载均走 Worker 服务端，使用 service_role 密钥；私有桶不对外直接暴露。
// 配置：SUPABASE_URL（var）+ SUPABASE_SERVICE_KEY（secret）+ 私有桶 "images"。

import type { Env } from "./types";

const BUCKET = "images";

export function storageEnabled(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
}

function objectUrl(env: Env, key: string): string {
  const base = String(env.SUPABASE_URL).replace(/\/+$/, "");
  return `${base}/storage/v1/object/${BUCKET}/${key}`;
}

function authHeaders(env: Env): Record<string, string> {
  const k = String(env.SUPABASE_SERVICE_KEY);
  return { Authorization: `Bearer ${k}`, apikey: k };
}

// 上传一张图（覆盖式）
export async function storagePut(
  env: Env,
  key: string,
  data: Uint8Array,
  contentType = "image/png",
): Promise<void> {
  const resp = await fetch(objectUrl(env, key), {
    method: "POST",
    headers: { ...authHeaders(env), "content-type": contentType, "x-upsert": "true" },
    body: data as unknown as BodyInit,
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Supabase 上传失败 (${resp.status}): ${detail.slice(0, 200)}`);
  }
}

// 下载一张图（供 /img 回源），返回上游 Response 或 null
export async function storageGet(env: Env, key: string): Promise<Response | null> {
  const resp = await fetch(objectUrl(env, key), { headers: authHeaders(env) });
  if (!resp.ok) return null;
  return resp;
}
