// 前端 API 封装（同源，cookie 自动携带）

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });
  const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok) throw new Error((data.error as string) || `请求失败 (${resp.status})`);
  return data as T;
}

export interface Me {
  email: string;
  credits: number;
  isAdmin?: boolean;
}

export interface AdminStats {
  users: number;
  generations: number;
  successfulGenerations: number;
  chatMessages: number;
  totalCredits: number;
}
export interface AdminUser {
  id: string;
  email: string;
  credits: number;
  createdAt: number;
  genCount: number;
  msgCount: number;
}
export interface AdminUserDetail {
  user: { id: string; email: string; credits: number; creditsResetDate: string; createdAt: number };
  generations: HistoryItem[];
  messages: { id: string; role: string; content: string; createdAt: number }[];
  transactions: { id: string; delta: number; reason: string; balanceAfter: number; createdAt: number }[];
}
export interface Model {
  id: string;
  name: string;
  creditBase: number;
  providerType: string;
}
export interface HistoryItem {
  id: string;
  modelName: string;
  prompt: string;
  size: string;
  n: number;
  creditCost: number;
  status: string;
  error: string;
  images: string[];
  createdAt: number;
}

export const api = {
  me: () => req<{ user: Me | null }>("/api/me"),
  register: (email: string, password: string) =>
    req<Me>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    req<Me>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => req<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  models: () => req<{ models: Model[] }>("/api/models"),
  estimate: (p: { modelId: string; prompt: string; size: string; quality: string; n: number }) =>
    req<{ cost: number }>("/api/estimate", { method: "POST", body: JSON.stringify(p) }),
  generate: (p: { modelId: string; prompt: string; size: string; quality: string; n: number }) =>
    req<{ id: string; images: string[]; creditCost: number; balance: number }>("/api/generate", {
      method: "POST",
      body: JSON.stringify(p),
    }),
  history: (cursor?: number) =>
    req<{ items: HistoryItem[]; nextCursor: number | null }>(
      `/api/history?limit=12${cursor ? `&cursor=${cursor}` : ""}`,
    ),

  adminStats: () => req<AdminStats>("/api/admin/stats"),
  adminUsers: () => req<{ users: AdminUser[] }>("/api/admin/users"),
  adminUserDetail: (id: string) => req<AdminUserDetail>(`/api/admin/users/${id}`),
  adminAdjustCredits: (id: string, delta: number) =>
    req<{ credits: number; applied: number }>(`/api/admin/users/${id}/credits`, {
      method: "POST",
      body: JSON.stringify({ delta }),
    }),
};
