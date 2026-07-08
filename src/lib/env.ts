import "server-only";

import crypto from "node:crypto";
export {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  requireAdminOrCronRequest,
  requireAdminRequest,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import { getRuntimeEnv } from "@/lib/runtime-env";

export function getAdminPassword(): string {
  const pwd = getRuntimeEnv("ADMIN_PASSWORD");
  if (!pwd) {
    throw new Error(
      "ADMIN_PASSWORD is not configured. Set it in .env.local for local dev or in your deployment environment.",
    );
  }
  return pwd;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL") && getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

export function requireAdminOrCronPassword(value: string | null): void {
  const adminPassword = getRuntimeEnv("ADMIN_PASSWORD");
  const cronSecret = getRuntimeEnv("CRON_SECRET");

  if (value && adminPassword && timingSafeEqual(value, adminPassword)) return;
  if (value && cronSecret && timingSafeEqual(value, cronSecret)) return;

  throw new Error("未授权，请检查后台密码或定时采集密钥。");
}

export function getCronSecretFromRequest(request: Request): string | null {
  const header = request.headers.get("x-cron-secret") || request.headers.get("x-admin-password");
  if (header) return header;

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    return token || null;
  }

  return null;
}

export function requireCronSecret(value: string | null): void {
  const cronSecret = getRuntimeEnv("CRON_SECRET");
  if (value && cronSecret && timingSafeEqual(value, cronSecret)) return;

  throw new Error("未授权，请检查定时采集密钥。");
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
