import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { readSponsorAssetImage } from "@/lib/sponsor-asset-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("ref") || "";
    const asset = await readSponsorAssetImage(reference);
    if (!asset) {
      return Response.json({ ok: false, message: "赞助图片不存在。" }, { status: 404 });
    }

    const headers = new Headers({
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": asset.contentType,
      "Content-Disposition": "inline",
      "X-Robots-Tag": "noindex",
    });
    if (typeof asset.size === "number") headers.set("Content-Length", String(asset.size));

    return new Response(asset.body, { headers });
  } catch (error) {
    logApiError("sponsor asset read", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "加载赞助图片失败。") },
      { status: 500 },
    );
  }
}
