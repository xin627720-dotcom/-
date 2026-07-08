import "server-only";

import { getCronSecretFromRequest, requireCronSecret } from "@/lib/env";
import { getRuntimeEnv } from "@/lib/runtime-env";

export function authorizeCronRequest(request: Request, action: string): Response | null {
  if (!getRuntimeEnv("CRON_SECRET") && process.env.NODE_ENV === "production") {
    return Response.json(
      { ok: false, message: `CRON_SECRET 未配置，已拒绝${action}。` },
      { status: 500 },
    );
  }

  try {
    requireCronSecret(getCronSecretFromRequest(request));
    return null;
  } catch {
    return Response.json({ ok: false, message: `无权${action}。` }, { status: 401 });
  }
}

export function cronMethodNotAllowed(action: string): Response {
  return Response.json(
    { ok: false, message: `请使用 POST ${action}。` },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}
