import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { requireAdminRequest } from "@/lib/env";
import {
  assertContentLengthWithinLimit,
  PUBLIC_FORM_BODY_MAX_BYTES,
} from "@/lib/public-request";
import { uploadSponsorAssetImage } from "@/lib/sponsor-asset-storage";
import { SPONSOR_PLACEMENT_KINDS } from "@/lib/sponsor-settings-shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
    assertContentLengthWithinLimit(request, PUBLIC_FORM_BODY_MAX_BYTES, "赞助图片上传内容");

    const formData = await request.formData();
    const placement = String(formData.get("placement") || "").trim();
    const creativeId = String(formData.get("creativeId") || "").trim();
    const file = formData.get("file");

    if (!SPONSOR_PLACEMENT_KINDS.includes(placement as (typeof SPONSOR_PLACEMENT_KINDS)[number])) {
      return Response.json({ ok: false, message: "缺少有效赞助站位。" }, { status: 400 });
    }
    if (!creativeId) {
      return Response.json({ ok: false, message: "缺少素材 ID。" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return Response.json({ ok: false, message: "缺少赞助图片文件。" }, { status: 400 });
    }

    const asset = await uploadSponsorAssetImage(placement, creativeId, file);
    return Response.json(
      { ok: true, asset },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    logApiError("admin sponsor asset upload", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "赞助图片上传失败。") },
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
