import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/env";

const ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_LOCK_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_MAX_FAILURES = 8;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

type LoginFailureState = {
  count: number;
  firstFailedAt: number;
  lockedUntil: number | null;
};

const loginFailures = new Map<string, LoginFailureState>();

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const retryAfterMs = getLoginRetryAfterMs(clientIp);
    if (retryAfterMs > 0) {
      return Response.json(
        { ok: false, message: "登录尝试过于频繁，请稍后再试。" },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
          },
        },
      );
    }

    const body = (await request.json().catch(() => null)) as { password?: string } | null;

    if (!await verifyAdminPassword(body?.password)) {
      recordLoginFailure(clientIp);
      return Response.json(
        { ok: false, message: "后台密码不正确。" },
        {
          status: 401,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    clearLoginFailure(clientIp);
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return Response.json(
      { ok: true },
      {
        headers: {
          ...NO_STORE_HEADERS,
          "Set-Cookie": `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(await createAdminSessionToken())}; Path=/; Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Strict${secure}`,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === "ADMIN_SESSION_SECRET is not configured."
        ? "后台登录会话密钥未配置：请设置 ADMIN_SESSION_SECRET 后再登录。"
        : "后台登录失败，请稍后再试。";
    return Response.json(
      { ok: false, message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

function getClientIp(request: Request): string {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function getLoginRetryAfterMs(clientIp: string): number {
  const state = loginFailures.get(clientIp);
  if (!state) return 0;

  const now = Date.now();
  if (state.lockedUntil && state.lockedUntil > now) {
    return state.lockedUntil - now;
  }

  if (now - state.firstFailedAt > ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS) {
    loginFailures.delete(clientIp);
  }

  return 0;
}

function recordLoginFailure(clientIp: string): void {
  pruneLoginFailures();

  const now = Date.now();
  const current = loginFailures.get(clientIp);
  const state =
    current && now - current.firstFailedAt <= ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS
      ? current
      : { count: 0, firstFailedAt: now, lockedUntil: null };

  state.count += 1;
  if (state.count >= ADMIN_LOGIN_MAX_FAILURES) {
    state.lockedUntil = now + ADMIN_LOGIN_LOCK_MS;
  }

  loginFailures.set(clientIp, state);
}

function clearLoginFailure(clientIp: string): void {
  loginFailures.delete(clientIp);
}

function pruneLoginFailures(): void {
  const now = Date.now();
  for (const [clientIp, state] of loginFailures) {
    const expiredWindow = now - state.firstFailedAt > ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS;
    const expiredLock = state.lockedUntil !== null && state.lockedUntil <= now;
    if (expiredWindow && (!state.lockedUntil || expiredLock)) {
      loginFailures.delete(clientIp);
    }
  }

  if (loginFailures.size <= 500) return;

  for (const clientIp of loginFailures.keys()) {
    loginFailures.delete(clientIp);
    if (loginFailures.size <= 400) return;
  }
}
