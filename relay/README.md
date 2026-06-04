# Codex 中转（在你本机运行）

sharedchat 的 `/codex` 接口套了 Cloudflare 反机器人 WAF，按 IP 拦截数据中心请求
（我们的网站后端 Cloudflare Worker 就被拦）。但**你本机的住宅 IP 不被拦**（Codex CLI 能用就是证明）。

本中转跑在你机器上，把网站后端发来的「OpenAI chat/completions 请求」翻译成 sharedchat 的
「Responses API」再转发——相当于给网站提供一个**可被服务器调用**的 OpenAI 兼容端点。

```
浏览器 → corezen.top (Worker) → 公网隧道 → 你机器上的中转(住宅IP) → sharedchat → 原路返回
```

## 前置
- 安装 Node.js 18+（`node -v` 确认）。

## 第 1 步：本机自测（确认能连通 sharedchat）
```bash
cd relay
node codex-relay.mjs --test
```
- 看到逐字输出 + `[自测成功] ✅` 就说明本机能调通。
- 若失败且出现 HTML/403 → 你本机 IP 也被拦（少见）；
  若是其它报错（如字段格式）→ 加 `--raw` 再跑一次，把打印的 `[事件类型]` 发给开发者调整解析：
  ```bash
  node codex-relay.mjs --test --raw
  ```

## 第 2 步：启动中转服务
自己取一个口令（RELAY_SECRET，随便一串，越长越好），Worker 端要用同一个：
```bash
# macOS / Linux
RELAY_SECRET='换成你自己的一串随机口令' node codex-relay.mjs

# Windows PowerShell
$env:RELAY_SECRET='换成你自己的一串随机口令'; node codex-relay.mjs
```
（sharedchat 的 key 已内置默认值，也可用 `SHAREDCHAT_KEY=sk-xxx` 覆盖。）

看到 `Codex 中转已启动: http://localhost:8787` 即可。

## 第 3 步：暴露成公网地址
中转只在本机监听，需要一个公网 https 地址让网站后端能访问。任选其一：

**Cloudflare Tunnel（推荐，免费）**
```bash
# 安装 cloudflared 后：
cloudflared tunnel --url http://localhost:8787
```
会打印一个 `https://xxxx.trycloudflare.com` 地址。

**或 ngrok**
```bash
ngrok http 8787
```
会打印一个 `https://xxxx.ngrok-free.app` 地址。

## 第 4 步：把信息发给开发者
- 公网地址（如 `https://xxxx.trycloudflare.com`）
- 你设置的 RELAY_SECRET 口令

开发者会把它们配到 Worker（`CODEX_BASE_URL` = 公网地址，`SHAREDCHAT_API_KEY` = 你的口令），
网站的 Codex 就能用了。

> 注意：中转和隧道需要**保持开着**，关掉网站 Codex 就用不了（因为依赖你本机的住宅 IP）。
> trycloudflare 的免费地址每次重启会变；要固定地址可用具名 Cloudflare Tunnel 或 ngrok 固定域名。
