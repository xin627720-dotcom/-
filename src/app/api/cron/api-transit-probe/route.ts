import { revalidatePath } from "next/cache";
import probeProfiles from "../../../../../config/api-transit-probes.json";
import { probeApiTransitStations } from "../../../../../scripts/probe-api-transit.mjs";
import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { clearTransitStationsCache } from "@/lib/api-transit-db";
import { authorizeCronRequest, cronMethodNotAllowed } from "@/lib/cron-auth";
import { prewarmPublicPaths, revalidateApiTransitPublicPaths } from "@/lib/public-revalidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function GET() {
  return cronMethodNotAllowed("执行 API 中转可用性监测");
}

export async function POST(request: Request) {
  return runApiTransitProbe(request);
}

async function runApiTransitProbe(request: Request) {
  const authError = authorizeCronRequest(request, "执行 API 中转可用性监测");
  if (authError) return authError;

  const startedAt = new Date().toISOString();
  const url = new URL(request.url);
  const station =
    url.searchParams.get("station") ||
    url.searchParams.get("stationId") ||
    url.searchParams.get("source") ||
    undefined;

  try {
    const result = await probeApiTransitStations({
      profiles: probeProfiles,
      station,
      post: true,
      dbCredentials: true,
      targetLimit: url.searchParams.get("targetLimit") || undefined,
      skipCompletions: url.searchParams.get("skipCompletions") || undefined,
      timeoutMs: url.searchParams.get("timeoutMs") || undefined,
    });

    if (result.runs.length || result.rollups.length) {
      clearTransitStationsCache();
      revalidatePath("/admin");
      revalidatePath("/admin/api-transit");
      const publicPaths = revalidateApiTransitPublicPaths();
      await prewarmPublicPaths(request, publicPaths);
    }

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    logApiError("cron api transit probe", error);
    return Response.json(
      {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        message: safeApiErrorMessage(error, "API 中转可用性监测失败。"),
      },
      { status: 500 },
    );
  }
}
