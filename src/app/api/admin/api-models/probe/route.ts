import { z } from "zod";
import { collectApiModels } from "../../../../../../scripts/collect-api-models.mjs";
import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { staticApiModelDataset } from "@/lib/api-models";
import { requireAdminRequest } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  provider: z.string().trim().min(1).default("openrouter"),
  noFetch: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
    const payload = schema.parse(await request.json().catch(() => ({})));
    const result = await collectApiModels({
      dataset: staticApiModelDataset,
      provider: payload.provider,
      dryRun: true,
      noFetch: payload.noFetch,
    });

    return Response.json({ ok: true, result });
  } catch (error) {
    logApiError("admin api models probe", error);
    const rawMessage = error instanceof Error ? error.message : "API 模型试采集失败。";
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "API 模型试采集失败。") },
      { status: error instanceof z.ZodError ? 400 : errorStatus(rawMessage) },
    );
  }
}

function errorStatus(message: string): number {
  if (message.includes("未授权")) return 401;
  return 500;
}
