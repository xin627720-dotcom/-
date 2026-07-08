import {
  listSiteFeedback,
  updateSiteFeedbackStatus,
} from "@/lib/admin";
import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { clearAdminDataCache } from "@/lib/data";
import { requireAdminRequest } from "@/lib/env";
import { z } from "zod";

const statusSchema = z.enum(["pending", "resolved", "ignored"]);

const patchSchema = z.object({
  id: z.string().min(1),
  status: statusSchema,
  reviewerNote: z.string().max(500).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const status = statusSchema.catch("pending").parse(searchParams.get("status") || "pending");
    const feedback = await listSiteFeedback(status);
    return Response.json({ ok: true, feedback });
  } catch (error) {
    logApiError("admin site feedback list", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "加载反馈失败。") },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminRequest(request);
    const payload = patchSchema.parse(await request.json());
    const feedback = await updateSiteFeedbackStatus(payload);
    clearAdminDataCache();
    return Response.json({ ok: true, feedback });
  } catch (error) {
    logApiError("admin site feedback update", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "处理反馈失败。") },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
