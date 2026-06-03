-- Codex 独立积分池（与图像生成积分分开计费）

ALTER TABLE users ADD COLUMN codex_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN codex_reset_date TEXT NOT NULL DEFAULT '';

-- 积分流水区分所属池：image（图像生成）| codex
ALTER TABLE credit_transactions ADD COLUMN pool TEXT NOT NULL DEFAULT 'image';
