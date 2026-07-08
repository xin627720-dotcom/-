import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { stableId } from "@/lib/utils";

export type OfficialPriceJobMode = "weekly_full" | "fx_only";

const STALE_OFFICIAL_PRICE_JOB_MS = 2 * 60 * 60 * 1000;

export async function enqueueOfficialPriceCollectionJob(
  request: Request,
  officialMode: OfficialPriceJobMode,
) {
  const authError = authorizeCronRequest(request, "创建官方地区价采集任务");
  if (authError) return authError;

  const startedAt = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return Response.json(
      { ok: false, startedAt, message: "Supabase 尚未配置，无法创建官方地区价采集任务。" },
      { status: 500 },
    );
  }

  try {
    const { existingJob, cancelledJobs } = await resolveExistingOfficialPriceJob(officialMode, startedAt);
    if (existingJob) {
      return Response.json({
        ok: true,
        mode: officialMode,
        skipped: true,
        cancelledStaleJobCount: cancelledJobs.length,
        startedAt,
        finishedAt: new Date().toISOString(),
        job: existingJob,
        message: "已有待处理的官方地区价采集任务，已跳过重复入队。",
      });
    }

    const row = {
      id: stableId("collection-job", "official_prices", officialMode, startedAt),
      job_type: "official_prices",
      source_id: null,
      source_name: officialMode === "fx_only" ? "官方地区价汇率刷新" : "官方地区价周全量",
      status: "pending",
      priority: officialMode === "fx_only" ? 15 : 25,
      attempts: 0,
      max_attempts: 2,
      requested_by: "cron",
      result: { officialMode },
      created_at: startedAt,
      updated_at: startedAt,
    };

    const { data, error } = await supabase
      .from("collection_jobs")
      .insert(row)
      .select("*")
      .single();

    if (error) throw error;

    return Response.json({
      ok: true,
      mode: officialMode,
      startedAt,
      finishedAt: new Date().toISOString(),
      job: data || row,
      cancelledStaleJobCount: cancelledJobs.length,
    });
  } catch (error) {
    logApiError("official price job enqueue", error);
    return Response.json(
      {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        message: safeApiErrorMessage(error, "创建官方地区价采集任务失败。"),
      },
      { status: 500 },
    );
  }
}

export function officialModeFromRequest(request: Request): OfficialPriceJobMode {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || searchParams.get("officialMode");
  return mode === "weekly_full" ? "weekly_full" : "fx_only";
}

async function resolveExistingOfficialPriceJob(
  officialMode: OfficialPriceJobMode,
  nowIso: string,
): Promise<{ existingJob: Record<string, unknown> | null; cancelledJobs: string[] }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { existingJob: null, cancelledJobs: [] };

  const { data, error } = await supabase
    .from("collection_jobs")
    .select("*")
    .eq("job_type", "official_prices")
    .in("status", ["pending", "running"])
    .contains("result", { officialMode })
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  const jobs = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  const staleJobs = jobs.filter((job) => isStaleOfficialPriceJob(job, nowIso));
  const cancelledJobs = staleJobs.map((job) => String(job.id)).filter(Boolean);

  if (cancelledJobs.length) {
    const cancelledAt = new Date().toISOString();
    const { error: cancelError } = await supabase
      .from("collection_jobs")
      .update({
        status: "cancelled",
        locked_by: null,
        locked_until: null,
        finished_at: cancelledAt,
        last_error: "官方地区价采集任务超过 2 小时未被执行，已由下一次入队自动取消。",
        updated_at: cancelledAt,
      })
      .in("id", cancelledJobs);

    if (cancelError) throw cancelError;
  }

  const cancelledSet = new Set(cancelledJobs);
  return {
    existingJob: jobs.find((job) => !cancelledSet.has(String(job.id))) || null,
    cancelledJobs,
  };
}

function isStaleOfficialPriceJob(job: Record<string, unknown>, nowIso: string): boolean {
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) return false;

  if (job.status === "running") {
    const lockedUntilMs = timestampMs(job.locked_until);
    if (lockedUntilMs != null) return lockedUntilMs < nowMs;
  }

  const referenceMs = timestampMs(job.started_at) ?? timestampMs(job.created_at) ?? timestampMs(job.updated_at);
  return referenceMs != null && nowMs - referenceMs > STALE_OFFICIAL_PRICE_JOB_MS;
}

function timestampMs(value: unknown): number | null {
  if (!value) return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}
