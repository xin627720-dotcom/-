// 鉴权：PBKDF2 密码哈希 + D1 会话

import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env, UserRow, Variables } from "./types";
import { getUserById, newId } from "./db";

const PBKDF2_ITER = 100_000;
const COOKIE_NAME = "cz_session";

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITER, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

// 存储格式： pbkdf2$<iter>$<saltHex>$<hashHex>
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${PBKDF2_ITER}$${toHex(salt.buffer)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const salt = fromHex(parts[2]);
  const expected = parts[3];
  const actual = await pbkdf2(password, salt);
  // 长度一致的常量时间比较
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = newId("s") + crypto.randomUUID().replace(/-/g, "");
  const ttlDays = parseInt(env.SESSION_TTL_DAYS || "30", 10);
  const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();
  return token;
}

export function setSessionCookie(c: Context, token: string, env: Env): void {
  const ttlDays = parseInt(env.SESSION_TTL_DAYS || "30", 10);
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: ttlDays * 24 * 60 * 60,
  });
}

export async function destroySession(c: Context, env: Env): Promise<void> {
  const token = getCookie(c, COOKIE_NAME);
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

export async function resolveUser(
  c: Context<{ Bindings: Env; Variables: Variables }>,
): Promise<UserRow | null> {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return null;
  const env = c.env;
  const sess = await env.DB.prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?")
    .bind(token)
    .first<{ user_id: string; expires_at: number }>();
  if (!sess) return null;
  if (sess.expires_at < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  return getUserById(env, sess.user_id);
}

// 中间件：要求已登录，否则 401。挂 user 到 context。
export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
): Promise<Response | void> {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: "未登录" }, 401);
  c.set("user", user);
  await next();
}

// 管理员判定：邮箱在 ADMIN_EMAILS（逗号分隔）名单内，大小写不敏感
export function isAdmin(env: Env, email: string): boolean {
  const raw = typeof env.ADMIN_EMAILS === "string" ? env.ADMIN_EMAILS : "";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

// 中间件：要求管理员
export async function requireAdmin(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
): Promise<Response | void> {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: "未登录" }, 401);
  if (!isAdmin(c.env, user.email)) return c.json({ error: "无管理员权限" }, 403);
  c.set("user", user);
  await next();
}
