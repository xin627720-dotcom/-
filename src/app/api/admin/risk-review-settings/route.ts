import { z } from "zod";
import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { clearAdminDataCache } from "@/lib/data";
import { requireAdminRequest } from "@/lib/env";
import { getRiskReviewSettingsSummary, updateRiskReviewSettings } from "@/lib/risk-review-settings";

const patchSchema = z.object({
  provider: z.string().trim().min(1).max(80).default("opencode"),
  baseUrl: z.string().trim().url().max(2048),
  model: z.string().trim().min(1).max(120),
  timeoutMs: z.number().int().min(3000).max(60000).default(12000),
  apiKey: z.string().trim().max(500).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request);
    return Response.json({ ok: true, settings: await getRiskReviewSettingsSummary() });
  } catch (error) {
    logApiError("admin risk review settings get", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "加载风险预审配置失败。") },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminRequest(request);
    const payload = patchSchema.parse(await request.json());
    const settings = await updateRiskReviewSettings({
      provider: payload.provider,
      baseUrl: payload.baseUrl,
      model: payload.model,
      timeoutMs: payload.timeoutMs,
      apiKey: payload.apiKey || null,
    });
    clearAdminDataCache();
    return Response.json({ ok: true, settings });
  } catch (error) {
    logApiError("admin risk review settings update", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "保存风险预审配置失败。") },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
