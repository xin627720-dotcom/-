// 管理后台：站点数据总览、用户列表、用户详情（对话/图片/积分）、手动增减积分

import type { Context } from "hono";
import type { Env, Variables } from "./types";
import { newId } from "./db";

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

export async function adminStats(c: Ctx): Promise<Response> {
  const db = c.env.DB;
  const [users, gens, msgs, credits] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM generations").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM chat_messages").first<{ n: number }>(),
    db.prepare("SELECT COALESCE(SUM(daily_credits),0) AS n FROM users").first<{ n: number }>(),
  ]);
  const succ = await db
    .prepare("SELECT COUNT(*) AS n FROM generations WHERE status = 'success'")
    .first<{ n: number }>();
  return c.json({
    users: users?.n ?? 0,
    generations: gens?.n ?? 0,
    successfulGenerations: succ?.n ?? 0,
    chatMessages: msgs?.n ?? 0,
    totalCredits: credits?.n ?? 0,
  });
}

export async function adminUsers(c: Ctx): Promise<Response> {
  const res = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.daily_credits, u.created_at,
            (SELECT COUNT(*) FROM generations g WHERE g.user_id = u.id) AS gen_count,
            (SELECT COUNT(*) FROM chat_messages m WHERE m.user_id = u.id) AS msg_count
       FROM users u
      ORDER BY u.created_at DESC
      LIMIT 200`,
  ).all<{
    id: string;
    email: string;
    daily_credits: number;
    created_at: number;
    gen_count: number;
    msg_count: number;
  }>();
  return c.json({
    users: (res.results ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      credits: u.daily_credits,
      createdAt: u.created_at,
      genCount: u.gen_count,
      msgCount: u.msg_count,
    })),
  });
}

export async function adminUserDetail(c: Ctx): Promise<Response> {
  const id = c.req.param("id");
  const db = c.env.DB;
  const user = await db
    .prepare("SELECT id, email, daily_credits, credits_reset_date, created_at FROM users WHERE id = ?")
    .bind(id)
    .first<{
      id: string;
      email: string;
      daily_credits: number;
      credits_reset_date: string;
      created_at: number;
    }>();
  if (!user) return c.json({ error: "用户不存在" }, 404);

  const gens = await db
    .prepare(
      "SELECT id, model_name, prompt, size, n, credit_cost, status, image_keys_json, error, created_at FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    )
    .bind(id)
    .all<{
      id: string;
      model_name: string;
      prompt: string;
      size: string;
      n: number;
      credit_cost: number;
      status: string;
      image_keys_json: string;
      error: string;
      created_at: number;
    }>();

  const msgs = await db
    .prepare(
      "SELECT id, role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 200",
    )
    .bind(id)
    .all<{ id: string; role: string; content: string; created_at: number }>();

  const tx = await db
    .prepare(
      "SELECT id, delta, reason, balance_after, created_at FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    )
    .bind(id)
    .all<{ id: string; delta: number; reason: string; balance_after: number; created_at: number }>();

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      credits: user.daily_credits,
      creditsResetDate: user.credits_reset_date,
      createdAt: user.created_at,
    },
    generations: (gens.results ?? []).map((g) => ({
      id: g.id,
      modelName: g.model_name,
      prompt: g.prompt,
      size: g.size,
      n: g.n,
      creditCost: g.credit_cost,
      status: g.status,
      error: g.error,
      images: (JSON.parse(g.image_keys_json || "[]") as string[]).map((k) => `/img/${k}`),
      createdAt: g.created_at,
    })),
    messages: (msgs.results ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    })),
    transactions: (tx.results ?? []).map((t) => ({
      id: t.id,
      delta: t.delta,
      reason: t.reason,
      balanceAfter: t.balance_after,
      createdAt: t.created_at,
    })),
  });
}

export async function adminAdjustCredits(c: Ctx): Promise<Response> {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { delta?: unknown } | null;
  const delta = Math.trunc(Number(body?.delta));
  if (!Number.isFinite(delta) || delta === 0) {
    return c.json({ error: "delta 必须为非零整数" }, 400);
  }
  const db = c.env.DB;
  const user = await db
    .prepare("SELECT daily_credits FROM users WHERE id = ?")
    .bind(id)
    .first<{ daily_credits: number }>();
  if (!user) return c.json({ error: "用户不存在" }, 404);

  const balanceAfter = Math.max(0, user.daily_credits + delta);
  const applied = balanceAfter - user.daily_credits; // 实际变动（扣减时不会扣成负数）
  const now = Date.now();
  await db.batch([
    db.prepare("UPDATE users SET daily_credits = ? WHERE id = ?").bind(balanceAfter, id),
    db
      .prepare(
        "INSERT INTO credit_transactions (id, user_id, generation_id, delta, reason, balance_after, created_at) VALUES (?, ?, '', ?, 'admin_adjust', ?, ?)",
      )
      .bind(newId("tx"), id, applied, balanceAfter, now),
  ]);
  return c.json({ credits: balanceAfter, applied });
}
