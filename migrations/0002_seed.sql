-- 预置生图模型。base_url 可改为国内中转地址；api_key_ref 对应 wrangler secret 名。
-- 用法：wrangler secret put OPENAI_API_KEY  之后即可使用这两个 OpenAI 兼容模型。

INSERT OR IGNORE INTO models
  (id, name, provider_type, base_url, api_key_ref, model_id, credit_base, enabled, sort)
VALUES
  ('m_gpt_image_1', 'OpenAI gpt-image-1', 'openai',
   'https://api.openai.com', 'OPENAI_API_KEY', 'gpt-image-1', 10, 1, 10),
  ('m_dalle3', 'OpenAI DALL·E 3', 'openai',
   'https://api.openai.com', 'OPENAI_API_KEY', 'dall-e-3', 8, 1, 20),
  -- 国内中转示例（默认关闭，改好 base_url 与 secret 后把 enabled 置 1）
  ('m_relay_demo', '国内中转 (OpenAI兼容)', 'openai',
   'https://your-relay.example.com', 'RELAY_API_KEY', 'gpt-image-1', 6, 0, 30),
  -- sharedchat 中转（用户提供）。密钥经 wrangler secret / .dev.vars 注入 SHAREDCHAT_API_KEY。
  -- 注意：codex 是代码模型，不能生图；model_id 必须填该中转实际支持的图像模型
  -- （如 gpt-image-1 / dall-e-3 / flux 等）。确认可用后把 enabled 置 1。
  ('m_sharedchat', 'sharedchat 中转', 'openai',
   'https://new.sharedchat.cc/codex', 'SHAREDCHAT_API_KEY', 'gpt-image-1', 8, 0, 25);
