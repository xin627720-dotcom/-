import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  requireAdminRequest,
} from "@/lib/env";
import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { clearAdminDataCache } from "@/lib/data";
import { getAdminPasswordStatus, updateAdminPassword } from "@/lib/admin-auth";
import { z } from "zod";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

const patchSchema = z.object({
  currentPassword: z.string().trim().min(1).max(200),
  newPassword: z.string().trim().min(1).max(200),
});

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request);
    return Response.json(
      { ok: true, passwordStatus: await getAdminPasswordStatus() },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    logApiError("admin password status", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "读取后台密码状态失败。") },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminRequest(request);
    const payload = patchSchema.parse(await request.json());
    const passwordStatus = await updateAdminPassword(payload);
    clearAdminDataCache();

    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return Response.json(
      { ok: true, passwordStatus },
      {
        headers: {
          ...NO_STORE_HEADERS,
          "Set-Cookie": `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(await createAdminSessionToken())}; Path=/; Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Strict${secure}`,
        },
      },
    );
  } catch (error) {
    logApiError("admin password update", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "修改后台密码失败。") },
      { status: error instanceof z.ZodError ? 400 : 500, headers: NO_STORE_HEADERS },
    );
  }
}
