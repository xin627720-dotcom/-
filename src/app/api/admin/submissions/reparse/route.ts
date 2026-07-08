import { z } from "zod";
import { reparseSubmission } from "@/lib/admin";
import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { clearAdminDataCache } from "@/lib/data";
import { requireAdminRequest } from "@/lib/env";

const schema = z.object({
  id: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
    const payload = schema.parse(await request.json());
    const submission = await reparseSubmission(payload.id);
    clearAdminDataCache();
    return Response.json({ ok: true, submission });
  } catch (error) {
    logApiError("admin submission reparse", error);
    const rawMessage = error instanceof Error ? error.message : "重新解析失败。";
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "重新解析失败。") },
      { status: error instanceof z.ZodError ? 400 : errorStatus(rawMessage) },
    );
  }
}

function errorStatus(message: string): number {
  if (message.includes("未授权")) return 401;
  if (message.includes("已被处理")) return 409;
  if (message.includes("不存在")) return 404;
  return 500;
}
