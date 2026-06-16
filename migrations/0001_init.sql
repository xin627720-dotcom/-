-- Corezen Image Studio — 初始表结构 (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  daily_credits       INTEGER NOT NULL DEFAULT 0,   -- 当前剩余积分
  credits_reset_date  TEXT NOT NULL DEFAULT '',      -- 上次发放日期 (北京时区 YYYY-MM-DD)
  created_at          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 可插拔生图模型配置；密钥本身不入库，api_key_ref 指向 Worker secret 名
CREATE TABLE IF NOT EXISTS models (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,                  -- 展示名，如 "OpenAI gpt-image-1"
  provider_type TEXT NOT NULL,                  -- openai | firefly | tongyi
  base_url      TEXT NOT NULL DEFAULT '',       -- OpenAI 兼容端点，可填国内中转
  api_key_ref   TEXT NOT NULL DEFAULT '',       -- 指向 wrangler secret 名，如 OPENAI_API_KEY
  model_id      TEXT NOT NULL DEFAULT '',       -- 厂商侧模型标识，如 gpt-image-1
  credit_base   INTEGER NOT NULL DEFAULT 5,     -- 该模型单张基础积分
  enabled       INTEGER NOT NULL DEFAULT 1,
  sort          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS generations (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  model_id        TEXT NOT NULL,
  model_name      TEXT NOT NULL DEFAULT '',
  prompt          TEXT NOT NULL,
  size            TEXT NOT NULL DEFAULT '1024x1024',
  quality         TEXT NOT NULL DEFAULT 'standard',
  n               INTEGER NOT NULL DEFAULT 1,
  credit_cost     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
  image_keys_json TEXT NOT NULL DEFAULT '[]',      -- R2 对象 key 列表
  error           TEXT NOT NULL DEFAULT '',
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gen_user_time ON generations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  generation_id  TEXT NOT NULL DEFAULT '',
  delta          INTEGER NOT NULL,             -- 负数=消耗，正数=发放/退款
  reason         TEXT NOT NULL,                -- daily_grant | generate | refund
  balance_after  INTEGER NOT NULL,
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_user_time ON credit_transactions(user_id, created_at DESC);
