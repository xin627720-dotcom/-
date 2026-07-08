import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { updateApiTransitSubmission } from "@/lib/api-transit-admin";
import { clearAdminDataCache } from "@/lib/data";
import { requireAdminRequest } from "@/lib/env";

const patchSchema = z.object({
  id: z.string().min(1),
  reviewStatus: z.enum(["pending", "collector_todo", "approved", "rejected"]),
  stationId: z.string().trim().min(1).nullable().optional(),
  adminNote: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdminRequest(request);
    const payload = patchSchema.parse(await request.json());
    const result = await updateApiTransitSubmission(payload);
    clearApiTransitAdminCaches();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    logApiError("admin api transit submission update", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "更新 API 中转提交失败。") },
      { status: error instanceof z.ZodError ? 400 : errorStatus(error) },
    );
  }
}

function clearApiTransitAdminCaches(): void {
  clearAdminDataCache();
  revalidatePath("/admin");
  revalidatePath("/admin/api-transit");
}

function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("未授权")) return 401;
  if (message.includes("不存在")) return 404;
  return 500;
}
