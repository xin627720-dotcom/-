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
  const tabs: { key: View; label: string }[] = [
    { key: "image", label: "AI 生图" },
    { key: "codex", label: "Codex 编程" },
    ...(me.isAdmin ? [{ key: "admin" as View, label: "管理后台" }] : []),
  ];
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-neutral-800 sticky top-0 bg-neutral-950/80 backdrop-blur z-20">
        <div className="flex items-center gap-5">
          <div className="font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
            Corezen
          </div>
          <nav className="flex gap-1 p-1 bg-neutral-900 rounded-lg">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => onView(t.key)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  view === t.key ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800">
            积分 <span className="text-indigo-400 font-semibold">{me.credits}</span>
          </span>
          <span className="text-neutral-500 hidden sm:inline">{me.email}</span>
          <button onClick={onLogout} className="text-neutral-400 hover:text-neutral-200 transition">
            退出
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
