import { useEffect, useState } from "react";
import { api, type Me } from "./api";
import AuthPage from "./components/AuthPage";
import Studio from "./components/Studio";
import CodexChat from "./components/CodexChat";
import Admin from "./components/Admin";
import Shell, { type View } from "./components/Shell";

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("image");

  useEffect(() => {
    api
      .me()
      .then((r) => setMe(r.user))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await api.logout().catch(() => {});
    setMe(null);
  }

  // 重新拉取余额（Codex 对话后端按用量后付费，结束后刷新）
  const refreshMe = () =>
    api
      .me()
      .then((r) => r.user && setMe(r.user))
      .catch(() => {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-600 text-sm">加载中…</div>
    );
  }

  if (!me) return <AuthPage onAuthed={setMe} />;

  return (
    <Shell me={me} view={view} onView={setView} onLogout={logout}>
      {view === "image" && <Studio onCredits={(c) => setMe({ ...me, credits: c })} />}
      {view === "codex" && <CodexChat onUsed={refreshMe} />}
      {view === "admin" && me.isAdmin && <Admin />}
    </Shell>
  );
}
