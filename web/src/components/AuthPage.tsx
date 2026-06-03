import { useState } from "react";
import { api, type Me } from "../api";

export default function AuthPage({ onAuthed }: { onAuthed: (me: Me) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const me = mode === "login" ? await api.login(email, password) : await api.register(email, password);
      onAuthed(me);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
            Corezen 图像工作室
          </div>
          <p className="text-sm text-neutral-400 mt-2">多模型云端 AI 生图</p>
        </div>

        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <div className="flex gap-1 p-1 bg-neutral-950 rounded-xl mb-5">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`flex-1 py-2 text-sm rounded-lg transition ${
                  mode === m ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {m === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">密码（至少 6 位）</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                placeholder="••••••"
              />
            </div>

            {error && <div className="text-sm text-rose-400 bg-rose-950/40 rounded-lg px-3 py-2">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium transition"
            >
              {loading ? "处理中…" : mode === "login" ? "登录" : "注册并登录"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-neutral-600 mt-5">注册即每日获得免费生图积分</p>
      </div>
    </div>
  );
}
