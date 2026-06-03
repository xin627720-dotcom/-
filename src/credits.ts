// 积分：每日发放（惰性、按北京时区）+ 消耗计算 + 扣费/退款

import type { Env, UserRow } from "./types";
import { newId } from "./db";

// 北京时区（UTC+8）当天日期 YYYY-MM-DD
export function beijingDate(now = Date.now()): string {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 跨天则把积分重置为每日额度；返回（可能已刷新的）最新用户。惰性调用。
export async function ensureDailyCredits(env: Env, user: UserRow): Promise<UserRow> {
  const today = beijingDate();
  if (user.credits_reset_date === today) return user;
  const daily = parseInt(env.DAILY_CREDITS || "100", 10);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET daily_credits = ?, credits_reset_date = ? WHERE id = ?").bind(
      daily,
      today,
      user.id,
    ),
    env.DB.prepare(
      "INSERT INTO credit_transactions (id, user_id, generation_id, delta, reason, balance_after, created_at) VALUES (?, ?, '', ?, 'daily_grant', ?, ?)",
    ).bind(newId("tx"), user.id, daily, daily, now),
  ]);
  return { ...user, daily_credits: daily, credits_reset_date: today };
}

const SIZE_FACTOR: Record<string, number> = {
  "256x256": 0.5,
  "512x512": 0.8,
  "1024x1024": 1.0,
  "1024x1792": 1.5,
  "1792x1024": 1.5,
};

const QUALITY_FACTOR: Record<string, number> = {
  standard: 1.0,
  hd: 1.5,
  high: 1.5,
};

// 提示词程度：按字符长度分档
function promptFactor(prompt: string): number {
  const len = prompt.trim().length;
  if (len < 50) return 1.0;
  if (len < 200) return 1.5;
  return 2.0;
}

// cost = ceil(credit_base × promptFactor × sizeFactor × qualityFactor × n)
export function computeCost(args: {
  creditBase: number;
  prompt: string;
  size: string;
  quality: string;
  n: number;
}): number {
  const sf = SIZE_FACTOR[args.size] ?? 1.0;
  const qf = QUALITY_FACTOR[args.quality] ?? 1.0;
  const pf = promptFactor(args.prompt);
  return Math.max(1, Math.ceil(args.creditBase * pf * sf * qf * Math.max(1, args.n)));
}

// 预扣积分（生成前）。余额不足返回 false。
export async function deductCredits(
  env: Env,
  user: UserRow,
  amount: number,
  generationId: string,
): Promise<{ ok: boolean; balanceAfter: number }> {
  if (user.daily_credits < amount) return { ok: false, balanceAfter: user.daily_credits };
  const balanceAfter = user.daily_credits - amount;
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET daily_credits = ? WHERE id = ? AND daily_credits >= ?").bind(
      balanceAfter,
      user.id,
      amount,
    ),
    env.DB.prepare(
      "INSERT INTO credit_transactions (id, user_id, generation_id, delta, reason, balance_after, created_at) VALUES (?, ?, ?, ?, 'generate', ?, ?)",
    ).bind(newId("tx"), user.id, generationId, -amount, balanceAfter, now),
  ]);
  return { ok: true, balanceAfter };
}

// 生成失败全额退款
export async function refundCredits(
  env: Env,
  userId: string,
  amount: number,
  generationId: string,
): Promise<number> {
  const now = Date.now();
  const user = await env.DB.prepare("SELECT daily_credits FROM users WHERE id = ?")
    .bind(userId)
    .first<{ daily_credits: number }>();
  const balanceAfter = (user?.daily_credits ?? 0) + amount;
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET daily_credits = daily_credits + ? WHERE id = ?").bind(amount, userId),
    env.DB.prepare(
      "INSERT INTO credit_transactions (id, user_id, generation_id, delta, reason, balance_after, created_at) VALUES (?, ?, ?, ?, 'refund', ?, ?)",
    ).bind(newId("tx"), userId, generationId, amount, balanceAfter, now),
  ]);
  return balanceAfter;
}
