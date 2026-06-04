import type { ReactNode } from "react";
import type { Me } from "../api";

export type View = "image" | "codex" | "admin";

export default function Shell({
  me,
  view,
  onView,
  onLogout,
  children,
}: {
  me: Me;
  view: View;
  onView: (v: View) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const tabs: { key: View; label: string; icon: string }[] = [
    { key: "image", label: "AI 生图", icon: "🎨" },
    { key: "codex", label: "Codex 编程", icon: "💻" },
    ...(me.isAdmin ? [{ key: "admin" as View, label: "管理后台", icon: "⚙️" }] : []),
  ];
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 h-16 border-b border-slate-200 sticky top-0 bg-white/90 backdrop-blur z-20 shadow-sm">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent shrink-0">
            Corezen
          </div>
          <nav className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => onView(t.key)}
                className={`px-3 sm:px-3.5 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                  view === t.key
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="text-xs">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-sm shrink-0">
          <span
            className={`px-2.5 py-1 rounded-full border font-medium ${
              view === "image"
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
            title="图像生成积分（每日重置）"
          >
            🎨 {me.credits}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full border font-medium ${
              view === "codex"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
            title="Codex 编程积分（每日重置，按输入输出计费）"
          >
            💻 {me.codexCredits}
          </span>
          <span className="text-slate-400 hidden md:inline max-w-[160px] truncate">{me.email}</span>
          <button
            onClick={onLogout}
            className="text-slate-500 hover:text-slate-800 font-medium transition px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            退出
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
