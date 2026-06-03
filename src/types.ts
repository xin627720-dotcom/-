// Worker 环境绑定 + 共享类型

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  DAILY_CREDITS: string;
  SESSION_TTL_DAYS: string;
  // 各 provider 密钥经 wrangler secret 注入，名称由 models.api_key_ref 指定。
  // 通过 (env as Record<string, string>)[api_key_ref] 动态取用。
  [key: string]: unknown;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  daily_credits: number;
  credits_reset_date: string;
  created_at: number;
}

export interface ModelRow {
  id: string;
  name: string;
  provider_type: "openai" | "firefly" | "tongyi";
  base_url: string;
  api_key_ref: string;
  model_id: string;
  credit_base: number;
  enabled: number;
  sort: number;
}

export interface GenerationRow {
  id: string;
  user_id: string;
  model_id: string;
  model_name: string;
  prompt: string;
  size: string;
  quality: string;
  n: number;
  credit_cost: number;
  status: "pending" | "success" | "failed";
  image_keys_json: string;
  error: string;
  created_at: number;
}

// 鉴权后挂到 Hono context 上的当前用户
export type Variables = {
  user: UserRow;
};
