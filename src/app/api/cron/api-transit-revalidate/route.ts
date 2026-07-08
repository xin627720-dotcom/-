import { revalidatePath } from "next/cache";
import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import {
  clearTransitStationsCache,
  refreshTransitStationsSnapshot,
} from "@/lib/api-transit-db";
import { authorizeCronRequest, cronMethodNotAllowed } from "@/lib/cron-auth";
import { prewarmPublicPaths, revalidateApiTransitPublicPaths } from "@/lib/public-revalidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export function GET() {
  return cronMethodNotAllowed("刷新 API 中转公开缓存");
}

export async function POST(request: Request) {
  const authError = authorizeCronRequest(request, "刷新 API 中转公开缓存");
  if (authError) return authError;

  const startedAt = new Date().toISOString();

  try {
    clearTransitStationsCache();
    const snapshot = await refreshTransitStationsSnapshot();
    revalidatePath("/admin");
    revalidatePath("/admin/api-transit");
    const publicPaths = revalidateApiTransitPublicPaths(snapshot.slugs);
    await prewarmPublicPaths(request, publicPaths);

    return Response.json({
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      snapshot,
      revalidatedPaths: publicPaths,
    });
  } catch (error) {
    logApiError("cron api transit revalidate", error);
    return Response.json(
      {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        message: safeApiErrorMessage(error, "API 中转公开缓存刷新失败。"),
      },
      { status: 500 },
    );
  }
}
