// Worker 入口：Hono 路由聚合 /api/* 与 /img/*；静态资源由 ASSETS 绑定托管

import { Hono } from "hono";
import type { Env, Variables } from "./types";
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  destroySession,
  resolveUser,
  requireAuth,
  requireAdmin,
  isAdmin,
} from "./auth";
import {
  getUserByEmail,
  createUser,
  listEnabledModels,
  listGenerations,
} from "./db";
import { ensureDailyCredits, ensureCodexCredits, computeCost } from "./credits";
import { handleGenerate } from "./generate";
import { handleCodexChat } from "./codex";
import { adminStats, adminUsers, adminUserDetail, adminAdjustCredits } from "./admin";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ---------- 鉴权 ----------
app.post("/api/auth/register", async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}) as Record<string, string>);
  if (!EMAIL_RE.test(email ?? "")) return c.json({ error: "邮箱格式不正确" }, 400);
  if (!password || password.length < 6) return c.json({ error: "密码至少 6 位" }, 400);
  if (await getUserByEmail(c.env, email)) return c.json({ error: "该邮箱已注册" }, 409);

  const user = await createUser(c.env, email, await hashPassword(password));
  const refreshed = await ensureCodexCredits(c.env, await ensureDailyCredits(c.env, user));
  const token = await createSession(c.env, user.id);
  setSessionCookie(c, token, c.env);
  return c.json({
    email: refreshed.email,
    credits: refreshed.daily_credits,
    codexCredits: refreshed.codex_credits,
  });
});

app.post("/api/auth/login", async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}) as Record<string, string>);
  const user = await getUserByEmail(c.env, email ?? "");
  if (!user || !(await verifyPassword(password ?? "", user.password_hash))) {
    return c.json({ error: "邮箱或密码错误" }, 401);
  }
  const refreshed = await ensureCodexCredits(c.env, await ensureDailyCredits(c.env, user));
  const token = await createSession(c.env, user.id);
  setSessionCookie(c, token, c.env);
  return c.json({
    email: refreshed.email,
    credits: refreshed.daily_credits,
    codexCredits: refreshed.codex_credits,
  });
});

app.post("/api/auth/logout", async (c) => {
  await destroySession(c, c.env);
  return c.json({ ok: true });
});

app.get("/api/me", async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ user: null });
  const refreshed = await ensureCodexCredits(c.env, await ensureDailyCredits(c.env, user));
  return c.json({
    user: {
      email: refreshed.email,
      credits: refreshed.daily_credits,
      codexCredits: refreshed.codex_credits,
      isAdmin: isAdmin(c.env, refreshed.email),
    },
  });
});

// ---------- 模型列表 ----------
app.get("/api/models", async (c) => {
  const models = await listEnabledModels(c.env);
  return c.json({
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      creditBase: m.credit_base,
      providerType: m.provider_type,
    })),
  });
});

// ---------- 积分预估 ----------
app.post("/api/estimate", requireAuth, async (c) => {
  const { modelId, prompt, size, quality, n } = await c.req.json().catch(() => ({}) as Record<string, unknown>);
  const models = await listEnabledModels(c.env);
  const model = models.find((m) => m.id === modelId);
  if (!model) return c.json({ error: "模型不存在" }, 400);
  const cost = computeCost({
    creditBase: model.credit_base,
    prompt: String(prompt ?? ""),
    size: String(size ?? "1024x1024"),
    quality: String(quality ?? "standard"),
    n: parseInt(String(n ?? "1"), 10) || 1,
  });
  return c.json({ cost });
});

// ---------- 生图 ----------
app.post("/api/generate", requireAuth, handleGenerate);

// ---------- Codex 编程助手（流式对话）----------
app.post("/api/codex/chat", requireAuth, handleCodexChat);

// ---------- 历史 ----------
app.get("/api/history", requireAuth, async (c) => {
  const user = c.get("user");
  const cursor = parseInt(c.req.query("cursor") ?? "", 10);
  const limit = Math.min(30, parseInt(c.req.query("limit") ?? "12", 10) || 12);
  const rows = await listGenerations(c.env, user.id, limit, Number.isFinite(cursor) ? cursor : undefined);
  return c.json({
    items: rows.map((r) => ({
      id: r.id,
      modelName: r.model_name,
      prompt: r.prompt,
      size: r.size,
      n: r.n,
      creditCost: r.credit_cost,
      status: r.status,
      error: r.error,
      images: (JSON.parse(r.image_keys_json || "[]") as string[]).map((k) => `/img/${k}`),
      createdAt: r.created_at,
    })),
    nextCursor: rows.length === limit ? rows[rows.length - 1].created_at : null,
  });
});

// ---------- 管理后台（仅 ADMIN_EMAILS 名单内可访问）----------
app.get("/api/admin/stats", requireAdmin, adminStats);
app.get("/api/admin/users", requireAdmin, adminUsers);
app.get("/api/admin/users/:id", requireAdmin, adminUserDetail);
app.post("/api/admin/users/:id/credits", requireAdmin, adminAdjustCredits);

// ---------- 图片回源（R2）----------
app.get("/img/*", async (c) => {
  const key = c.req.path.replace(/^\/img\//, "");
  if (!key) return c.notFound();
  if (!c.env.BUCKET) return c.notFound();
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
});

// 其余路径交给静态资源（SPA）。assets 绑定在 wrangler.toml 已设 run_worker_first，
// 命中 /api、/img 才进 Worker；其余由平台直接返回静态文件。
app.all("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
