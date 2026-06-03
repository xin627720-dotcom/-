# Corezen Image Studio

云端多模型 AI 生图网站 + Codex 云端编程助手 + 管理后台。全栈基于 **Cloudflare**（Workers + D1 + R2），前端 React + Vite + Tailwind。

## 功能

- **AI 生图**：登录后输入提示词，云端调用图像生成 API 出图。多模型可插拔网关，按「提示词程度 × 模型 × 尺寸/质量 × 数量」扣积分；失败自动退款。
- **Codex 编程助手**：云端流式对话写/改/调代码（OpenAI 兼容中转）。对话持久化。
- **用户系统**：邮箱+密码登录、每日免费积分（默认 100，按北京时区刷新）、生成历史。
- **管理后台**（管理员可见）：站点数据总览、用户列表、单用户对话/图片/积分流水查看、**手动增减某用户积分**。

## 技术栈

- 前端：React + Vite + TailwindCSS（`web/`），构建为静态资源
- 后端：单个 Cloudflare Worker + Hono（`src/`），`/api/*` 与 `/img/*`
- 数据：Cloudflare D1（SQLite）；图片：Cloudflare R2
- 鉴权：PBKDF2 密码哈希 + httpOnly Cookie 会话（D1 存储）

## 本地开发

```bash
npm install

# 1) 创建 D1 与 R2（首次）
npx wrangler d1 create corezen_db          # 把输出的 database_id 填入 wrangler.toml
npx wrangler r2 bucket create corezen-images

# 2) 初始化表结构 + 种子模型
npm run db:init:local && npm run db:seed:local
npx wrangler d1 execute corezen_db --local --file=./migrations/0003_chat.sql

# 3) 配置本地密钥（.dev.vars，已 gitignore，不会提交）
#   SHAREDCHAT_API_KEY="..."     # Codex / 中转生图密钥
#   OPENAI_API_KEY="..."         # 若用 OpenAI 生图
#   ADMIN_EMAILS="you@x.com"     # 管理员邮箱（也可写在 wrangler.toml vars）

# 4) 起站（前后端同端口）
npm run dev                       # 构建前端 + wrangler dev
# 或前端热更新：npm run dev:web（已配置代理到 :8787）
```

## 部署（Cloudflare，绑定 corezen.top）

```bash
npm run db:init:remote && npm run db:seed:remote
npx wrangler d1 execute corezen_db --remote --file=./migrations/0003_chat.sql

# 线上密钥用 secret 注入（不要写进仓库）
npx wrangler secret put SHAREDCHAT_API_KEY
npx wrangler secret put OPENAI_API_KEY          # 如需

# wrangler.toml 里设置 ADMIN_EMAILS、CODEX_MODEL 等 vars 后：
npm run deploy
# 在 Cloudflare 控制台把 corezen.top 作为自定义域绑定到本 Worker
```

## 生图模型配置

模型存于 D1 `models` 表，密钥不入库——`api_key_ref` 字段指向某个 secret 名。
内置 **OpenAI 兼容适配器**（`src/providers/openai.ts`），覆盖 OpenAI 官方、国内中转、多数国产 OpenAI 兼容端点：只需在 `models` 表加一行 `{name, base_url, api_key_ref, model_id, credit_base}` 即可。Firefly / 通义万相适配器留有接口占位，待补凭证。

## 说明 / 注意

- **Codex 是代码模型，不能生图**；它用于「Codex 编程」对话。中转站 `new.sharedchat.cc` 若同时代理了图像模型（如 gpt-image-1/dall-e-3），把 `models` 表里 `m_sharedchat` 行的 `model_id` 改成该图像模型并 `enabled=1` 即可用于生图。
- 中转端点对部分出口 IP 有 Cloudflare 人机校验；从真实 Worker 出口或国内网络通常正常。
- OpenAI/Adobe/Cloudflare 在中国大陆均不能直连；面向国内请优先用国内中转或国产厂商端点。
