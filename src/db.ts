// D1 查询封装

import type { Env, UserRow, ModelRow, GenerationRow } from "./types";

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export async function getUserByEmail(env: Env, email: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
}

export async function getUserById(env: Env, id: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

export async function createUser(env: Env, email: string, passwordHash: string): Promise<UserRow> {
  const id = newId("u");
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, daily_credits, credits_reset_date, created_at) VALUES (?, ?, ?, 0, '', ?)",
  )
    .bind(id, email, passwordHash, now)
    .run();
  return {
    id,
    email,
    password_hash: passwordHash,
    daily_credits: 0,
    credits_reset_date: "",
    codex_credits: 0,
    codex_reset_date: "",
    created_at: now,
  };
}

export async function listEnabledModels(env: Env): Promise<ModelRow[]> {
  const res = await env.DB.prepare(
    "SELECT * FROM models WHERE enabled = 1 ORDER BY sort ASC, name ASC",
  ).all<ModelRow>();
  return res.results ?? [];
}

export async function getModelById(env: Env, id: string): Promise<ModelRow | null> {
  return env.DB.prepare("SELECT * FROM models WHERE id = ? AND enabled = 1").bind(id).first<ModelRow>();
}

export async function insertGeneration(env: Env, row: GenerationRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO generations
       (id, user_id, model_id, model_name, prompt, size, quality, n, credit_cost, status, image_keys_json, error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.user_id,
      row.model_id,
      row.model_name,
      row.prompt,
      row.size,
      row.quality,
      row.n,
      row.credit_cost,
      row.status,
      row.image_keys_json,
      row.error,
      row.created_at,
    )
    .run();
}

export async function updateGeneration(
  env: Env,
  id: string,
  fields: Partial<Pick<GenerationRow, "status" | "image_keys_json" | "error">>,
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (sets.length === 0) return;
  vals.push(id);
  await env.DB.prepare(`UPDATE generations SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
}

export async function insertChatMessage(
  env: Env,
  userId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO chat_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(newId("c"), userId, role, content, Date.now())
    .run();
}

export async function listGenerations(
  env: Env,
  userId: string,
  limit: number,
  beforeTs?: number,
): Promise<GenerationRow[]> {
  const stmt = beforeTs
    ? env.DB.prepare(
        "SELECT * FROM generations WHERE user_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?",
      ).bind(userId, beforeTs, limit)
    : env.DB.prepare(
        "SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      ).bind(userId, limit);
  const res = await stmt.all<GenerationRow>();
  return res.results ?? [];
}
