// Codex 编程助手：把对话转发到 sharedchat 中转的 chat/completions（OpenAI 兼容），
// 流式（SSE）透传给前端。密钥只在 Worker 侧使用，不下发到浏览器。

import type { Context } from "hono";
import type { Env, Variables } from "./types";
import { insertChatMessage } from "./db";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT =
  "你是 Codex，一个运行在云端的编程助手。请用简洁专业的方式帮助用户编写、解释和调试代码。" +
  "回答中的代码请使用 Markdown 代码块并标注语言。";

const MAX_MESSAGES = 40;
const MAX_CHARS = 24000;

export async function handleCodexChat(
  c: Context<{ Bindings: Env; Variables: Variables }>,
): Promise<Response> {
  const env = c.env;
  const key = typeof env.SHAREDCHAT_API_KEY === "string" ? env.SHAREDCHAT_API_KEY : "";
  if (!key) {
    return c.json(
      { error: "Codex 未配置密钥：请用 wrangler secret put SHAREDCHAT_API_KEY 配置（本地写入 .dev.vars）。" },
      400,
    );
  }

  const body = (await c.req.json().catch(() => null)) as { messages?: unknown } | null;
  const raw = Array.isArray(body?.messages) ? (body!.messages as ChatMessage[]) : [];
  const messages = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_CHARS) }));

  if (messages.length === 0) return c.json({ error: "消息不能为空" }, 400);

  const user = c.get("user");
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    // 持久化用户消息（供管理后台查看），失败不阻塞对话
    c.executionCtx.waitUntil(
      insertChatMessage(env, user.id, "user", lastUser.content).catch(() => {}),
    );
  }

  const base = (typeof env.CODEX_BASE_URL === "string" && env.CODEX_BASE_URL
    ? env.CODEX_BASE_URL
    : "https://new.sharedchat.cc/codex"
  ).replace(/\/+$/, "");
  const model = typeof env.CODEX_MODEL === "string" && env.CODEX_MODEL ? env.CODEX_MODEL : "gpt-5-codex";

  const upstream = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    let msg = `Codex 服务返回错误（HTTP ${upstream.status}）`;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j.error?.message) msg = j.error.message;
    } catch {
      if (text) msg += `：${text.slice(0, 300)}`;
    }
    return c.json({ error: msg }, 502);
  }

  // SSE 透传，同时旁路累积助手回复以便落库（供管理后台查看）
  const decoder = new TextDecoder();
  let acc = "";
  let sseBuf = "";
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));

  const tee = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      sseBuf += decoder.decode(chunk, { stream: true });
      const lines = sseBuf.split("\n");
      sseBuf = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
          const d = j.choices?.[0]?.delta?.content;
          if (d) acc += d;
        } catch {
          // 忽略非 JSON 行
        }
      }
    },
    flush() {
      resolveDone();
    },
  });

  c.executionCtx.waitUntil(
    done.then(() => (acc ? insertChatMessage(env, user.id, "assistant", acc) : undefined)).catch(() => {}),
  );

  return new Response(upstream.body.pipeThrough(tee), {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
