import { useEffect, useState } from "react";
import { api, type AdminStats, type AdminUser, type AdminUserDetail } from "../api";

function fmt(ts: number) {
  return new Date(ts).toLocaleString("zh-CN");
}

export default function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [delta, setDelta] = useState("");
  const [pool, setPool] = useState<"image" | "codex">("image");
  const [busy, setBusy] = useState(false);

  function reload() {
    api.adminStats().then(setStats).catch((e) => setError(e.message));
    api.adminUsers().then((r) => setUsers(r.users)).catch((e) => setError(e.message));
  }
  useEffect(reload, []);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    api.adminUserDetail(selected).then(setDetail).catch((e) => setError(e.message));
  }, [selected]);

  async function adjust() {
    if (!selected) return;
    const d = parseInt(delta, 10);
    if (!d) return;
    setBusy(true);
    setError("");
    try {
      await api.adminAdjustCredits(selected, d, pool);
      setDelta("");
      const fresh = await api.adminUserDetail(selected);
      setDetail(fresh);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  const statCards: { label: string; value: number | undefined }[] = [
    { label: "用户数", value: stats?.users },
    { label: "生成总数", value: stats?.generations },
    { label: "成功生成", value: stats?.successfulGenerations },
    { label: "对话消息", value: stats?.chatMessages },
    { label: "图像积分", value: stats?.totalCredits },
    { label: "Codex积分", value: stats?.totalCodexCredits },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">管理后台</h1>
      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6">
        {/* 用户列表 */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">用户（{users.length}）</h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u.id)}
                className={`w-full text-left px-3 py-2.5 transition ${
                  selected === u.id ? "bg-indigo-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-800 truncate">{u.email}</span>
                  <span className="text-xs shrink-0 ml-2 space-x-1.5">
                    <span className="text-indigo-600 font-semibold" title="图像积分">图{u.credits}</span>
                    <span className="text-emerald-600 font-semibold" title="Codex积分">码{u.codexCredits}</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  图 {u.genCount} · 对话 {u.msgCount} · {fmt(u.createdAt)}
                </div>
              </button>
            ))}
            {users.length === 0 && <div className="px-3 py-4 text-sm text-slate-400">暂无用户</div>}
          </div>
        </div>

        {/* 用户详情 */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">用户详情</h2>
          {!detail ? (
            <div className="text-sm text-slate-400 border border-dashed border-slate-300 rounded-xl p-6 text-center bg-white">
              选择左侧用户查看其对话、图片与积分
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-sm font-medium text-slate-900">{detail.user.email}</div>
                <div className="text-xs text-slate-500 mt-1">
                  图像积分 <span className="text-indigo-600 font-semibold">{detail.user.credits}</span> · Codex积分{" "}
                  <span className="text-emerald-600 font-semibold">{detail.user.codexCredits}</span> · 注册于{" "}
                  {fmt(detail.user.createdAt)}
                </div>
                <div className="flex gap-2 mt-3">
                  <select
                    value={pool}
                    onChange={(e) => setPool(e.target.value as "image" | "codex")}
                    className="px-2 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="image">图像池</option>
                    <option value="codex">Codex池</option>
                  </select>
                  <input
                    type="number"
                    value={delta}
                    onChange={(e) => setDelta(e.target.value)}
                    placeholder="增减积分，如 50 或 -20"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={adjust}
                    disabled={busy || !delta}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 rounded-lg text-sm font-semibold shadow-sm shadow-indigo-200"
                  >
                    应用
                  </button>
                </div>
              </div>

              <Section title={`对话记录（${detail.messages.length}）`}>
                {detail.messages.length === 0 ? (
                  <Empty>无对话</Empty>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    {detail.messages.map((m) => (
                      <div key={m.id} className="text-sm">
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded mr-2 font-medium ${
                            m.role === "user"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {m.role === "user" ? "用户" : "Codex"}
                        </span>
                        <span className="text-slate-700 whitespace-pre-wrap break-words">
                          {m.content.length > 500 ? m.content.slice(0, 500) + "…" : m.content}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={`生成图片（${detail.generations.length}）`}>
                {detail.generations.length === 0 ? (
                  <Empty>无生成记录</Empty>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {detail.generations.map((g) => (
                      <div key={g.id} className="border border-slate-200 rounded-lg p-2 bg-white shadow-sm">
                        <div className="text-[11px] text-slate-500 mb-1">
                          {g.modelName} · {g.size} · {g.creditCost}分 · {g.status}
                        </div>
                        <div className="text-xs text-slate-600 mb-2 line-clamp-2">{g.prompt}</div>
                        {g.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-1.5">
                            {g.images.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer">
                                <img src={url} className="aspect-square object-cover rounded" alt="" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="积分流水">
                {detail.transactions.length === 0 ? (
                  <Empty>无流水</Empty>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1 text-xs bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    {detail.transactions.map((t) => (
                      <div key={t.id} className="flex justify-between text-slate-500">
                        <span>
                          <span
                            className={`mr-1.5 px-1 rounded font-medium ${
                              t.pool === "codex"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {t.pool === "codex" ? "码" : "图"}
                          </span>
                          {t.reason} · 余额 {t.balanceAfter}
                        </span>
                        <span className={t.delta >= 0 ? "text-emerald-600 font-medium" : "text-rose-500 font-medium"}>
                          {t.delta >= 0 ? "+" : ""}
                          {t.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-slate-400">{children}</div>;
}
