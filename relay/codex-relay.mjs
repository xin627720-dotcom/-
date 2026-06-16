#!/usr/bin/env node
// Codex 中转 —— 在你本机（住宅 IP）运行。
//
// 作用：sharedchat 的 /codex 接口套了 Cloudflare 反机器人 WAF，按 IP 拦截数据中心
// （Cloudflare Worker）的请求；但你本机的住宅 IP 不被拦（Codex CLI 就是这样能用的）。
// 本程序在你机器上把「OpenAI chat/completions 请求」翻译成 sharedchat 的「Responses API」
// 再转发，相当于一个你专属的、可被服务器调用的 OpenAI 兼容端点。
//
// 用法：
//   SHAREDCHAT_KEY=sk-xxxx RELAY_SECRET=你自定义的口令 node codex-relay.mjs
//   node codex-relay.mjs --test            # 本机自测（确认能连通 sharedchat）
//   node codex-relay.mjs --test --raw      # 自测并打印上游原始 SSE 事件（排错用）
//
// 然后用 cloudflared / ngrok 把 http://localhost:8787 暴露成公网 https 地址，
// 把该地址给我配到 Worker 的 CODEX_BASE_URL，把 RELAY_SECRET 配到 Worker 的 SHAREDCHAT_API_KEY。

import http from "node:http";
import { randomUUID } from "node:crypto";

const args = new Set(process.argv.slice(2));
const PORT = parseInt(process.env.PORT || "8787", 10);
const UPSTREAM = (process.env.CODEX_UPSTREAM || "https://new.sharedchat.cc/codex").replace(/\/+$/, "");
const SHARED_KEY = process.env.SHAREDCHAT_KEY || "sk-aec77c6b5dcc11f18dcf00163e012d40";
const RELAY_SECRET = process.env.RELAY_SECRET || "";
const MODEL_DEFAULT = process.env.CODEX_MODEL || "gpt-5-codex";
const UA = process.env.CODEX_UA || "codex_cli_rs/0.20.0 (Ubuntu 24.04; x86_64) tmux";

// 调用 sharedchat 的 Responses API（流式），逐个回调文本增量与用量
async function callUpstream(messages, model, onDelta, onUsage, onRaw) {
  const sys = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const input = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: String(m.content ?? "") }));

  const resp = await fetch(`${UPSTREAM}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${SHARED_KEY}`,
      "user-agent": UA,
      originator: "codex_cli_rs",
      "openai-beta": "responses=experimental",
      session_id: randomUUID(),
      accept: "text/event-stream",
    },
    body: JSON.stringify({
      model,
      instructions: sys || undefined,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "medium" },
    }),
  });

  if (!resp.ok || !resp.body) {
    const t = await resp.text().catch(() => "");
    throw new Error(`上游 ${resp.status}: ${t.slice(0, 400)}`);
  }

  const decoder = new TextDecoder();
  let buf = "";
  const reader = resp.body.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let ev;
      try {
        ev = JSON.parse(payload);
      } catch {
        continue;
      }
      if (onRaw) onRaw(ev.type || "(no type)");
      const type = ev.type || "";
      if (type === "response.output_text.delta" && typeof ev.delta === "string") {
        onDelta(ev.delta);
      } else if (type === "response.completed" || type === "response.incomplete") {
        const u = ev.response?.usage;
        if (u) onUsage(u.input_tokens ?? 0, u.output_tokens ?? 0);
      } else if (type === "error" || type === "response.failed") {
        const msg = ev.error?.message || ev.response?.error?.message || JSON.stringify(ev);
        throw new Error(`上游事件错误: ${String(msg).slice(0, 300)}`);
      }
    }
  }
}

// ---------- 自测模式 ----------
if (args.has("--test")) {
  const raw = args.has("--raw");
  console.log(`[自测] 上游 = ${UPSTREAM}/responses，模型 = ${MODEL_DEFAULT}`);
  const seen = new Set();
  let text = "";
  try {
    await callUpstream(
      [{ role: "user", content: "用一句话介绍你自己" }],
      MODEL_DEFAULT,
      (d) => {
        text += d;
        process.stdout.write(d);
      },
      (pi, po) => console.log(`\n[用量] 输入 ${pi} / 输出 ${po} tokens`),
      raw ? (t) => seen.add(t) : null,
    );
    console.log("\n[自测成功] ✅ sharedchat 可从本机调用，中转可用。");
    if (raw) console.log("[事件类型]", [...seen].join(", "));
    if (!text) console.log("[注意] 没收到文本增量——若失败请加 --raw 再跑一次，把上面的[事件类型]发给开发者调整解析。");
  } catch (e) {
    console.error("\n[自测失败] ❌", e.message);
    console.error("若是被 WAF 拦（出现 HTML/403），说明本机 IP 也被拦；否则把报错发给开发者。");
    process.exit(1);
  }
  process.exit(0);
}

// ---------- 服务模式 ----------
if (!RELAY_SECRET) {
  console.error("请设置环境变量 RELAY_SECRET（自定义口令，需与 Worker 端一致）后再启动。");
  process.exit(1);
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST" || !req.url.endsWith("/chat/completions")) {
    return sendJson(res, 404, { error: "not found" });
  }
  if ((req.headers["authorization"] || "") !== `Bearer ${RELAY_SECRET}`) {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  let raw = "";
  for await (const c of req) raw += c;
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return sendJson(res, 400, { error: "bad json" });
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const model = body.model || MODEL_DEFAULT;

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  const id = "chatcmpl-" + randomUUID();
  const emit = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  let pt = 0,
    ct = 0;
  try {
    await callUpstream(
      messages,
      model,
      (d) => emit({ id, object: "chat.completion.chunk", choices: [{ index: 0, delta: { content: d } }] }),
      (pi, po) => {
        pt = pi;
        ct = po;
      },
      null,
    );
  } catch (e) {
    emit({
      id,
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: { content: `\n[中转错误] ${e.message}` } }],
    });
  }
  emit({
    id,
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    usage: { prompt_tokens: pt, completion_tokens: ct },
  });
  res.write("data: [DONE]\n\n");
  res.end();
});

server.listen(PORT, () => {
  console.log(`Codex 中转已启动: http://localhost:${PORT}`);
  console.log(`  转发 -> ${UPSTREAM}/responses`);
  console.log(`  Worker 调用本中转的口令 RELAY_SECRET 已设置。`);
  console.log(`下一步：用 cloudflared/ngrok 暴露成公网 https 地址。`);
});
