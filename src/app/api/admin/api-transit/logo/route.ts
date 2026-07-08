import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { uploadApiTransitLogoImage } from "@/lib/api-transit-logo-storage";
import { requireAdminRequest } from "@/lib/env";
import {
  assertContentLengthWithinLimit,
  PUBLIC_FORM_BODY_MAX_BYTES,
} from "@/lib/public-request";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
    assertContentLengthWithinLimit(request, PUBLIC_FORM_BODY_MAX_BYTES, "Logo 上传内容");

    const formData = await request.formData();
    const stationId = String(formData.get("stationId") || "").trim();
    const file = formData.get("file");

    if (!stationId) {
      return Response.json({ ok: false, message: "缺少站点 ID。" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return Response.json({ ok: false, message: "缺少 Logo 文件。" }, { status: 400 });
    }

    const logo = await uploadApiTransitLogoImage(stationId, file);
    return Response.json(
      { ok: true, logo },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    logApiError("admin api transit logo upload", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "Logo 上传失败。") },
      {
        status: getErrorStatus(error),
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}

function getErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  if (/未授权/.test(error.message)) return 401;
  if (/缺少|无效|不支持|超过/.test(error.message)) return 400;
  if (/尚未配置|暂不可用/.test(error.message)) return 503;
  return 500;
}
