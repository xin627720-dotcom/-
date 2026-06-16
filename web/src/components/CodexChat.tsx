import { useRef, useState, useEffect } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// 极简 Markdown：把 ```code``` 代码块渲染为 <pre>，其余按纯文本（保留换行）
function renderContent(text: string) {
  const parts = text.split(/```/);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const firstNl = part.indexOf("\n");
      const code = firstNl >= 0 ? part.slice(firstNl + 1) : part;
      return (
        <pre
          key={i}
          className="my-2 p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[13px] leading-relaxed"
        >
          <code>{code}</code>
        </pre>
      );
    }
    return (
      <span key={i} className="whitespace-pre-wrap break-words">
        {part}
      </span>
    );
  });
}

export default function CodexChat({ onUsed }: { onUsed?: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setError("");
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const resp = await fetch("/api/codex/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok || !resp.body) {
        const data = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `请求失败 (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            // 忽略非 JSON 的心跳/空行
          }
        }
      }

      if (!acc) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: "（无返回内容）" };
          return copy;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "对话失败");
      // 移除空的 assistant 占位
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length && copy[copy.length - 1].role === "assistant" && !copy[copy.length - 1].content) {
          copy.pop();
        }
        return copy;
      });
    } finally {
      setStreaming(false);
      // 对话结束后端已按用量扣 Codex 积分，刷新顶部余额
      onUsed?.();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 mt-20">
              <div className="text-3xl mb-3">💻</div>
              <p className="text-sm text-slate-600 font-medium">Codex 云端编程助手</p>
              <p className="text-xs mt-1.5 text-slate-400">让它帮你写代码、解释或调试</p>
              <p className="text-xs mt-3 text-slate-400">例如：“用 Python 写一个快速排序并解释复杂度”</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                }`}
              >
                {m.role === "assistant" && streaming && i === messages.length - 1 && !m.content ? (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </span>
                ) : (
                  renderContent(m.content)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          {error && <div className="text-sm text-rose-600 mb-2">{error}</div>}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="输入编程问题，Enter 发送，Shift+Enter 换行"
              className="flex-1 resize-none max-h-40 px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 transition"
            >
              {streaming ? "…" : "发送"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
