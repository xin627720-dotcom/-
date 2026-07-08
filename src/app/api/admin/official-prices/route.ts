import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { clearAdminDataCache } from "@/lib/data";
import { requireAdminRequest } from "@/lib/env";
import { clearOfficialPricesCache } from "@/lib/official-prices-db";
import { getSupabaseServerClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const priceStatusSchema = z.enum(["available", "stale", "missing", "parse_failed", "needs_review"]);

const patchSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("app"),
    id: z.string().min(1),
    enabled: z.boolean(),
  }),
  z.object({
    target: z.literal("plan"),
    id: z.string().min(1),
    enabled: z.boolean(),
  }),
  z.object({
    target: z.literal("region"),
    id: z.string().min(1),
    enabled: z.boolean(),
  }),
  z.object({
    target: z.literal("price"),
    id: z.string().min(1),
    status: priceStatusSchema,
    failureReason: z.string().trim().max(500).optional().nullable(),
  }),
]);

export async function PATCH(request: Request) {
  try {
    await requireAdminRequest(request);
    const payload = patchSchema.parse(await request.json());
    const supabase = getSupabaseServerClient();
    if (!supabase) throw new Error("Supabase 尚未配置，无法更新官方地区价。");

    if (payload.target === "app") {
      const app = await updateEnabledRow("official_subscription_apps", payload.id, payload.enabled);
      clearOfficialCaches();
      return Response.json({ ok: true, app });
    }

    if (payload.target === "plan") {
      const plan = await updateEnabledRow("official_subscription_plans", payload.id, payload.enabled);
      clearOfficialCaches();
      return Response.json({ ok: true, plan });
    }

    if (payload.target === "region") {
      const region = await updateEnabledRow("official_subscription_regions", payload.id, payload.enabled);
      clearOfficialCaches();
      return Response.json({ ok: true, region });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("official_subscription_region_prices")
      .update({
        status: payload.status,
        failure_reason: payload.status === "available" ? null : payload.failureReason || manualStatusReason(payload.status),
        last_checked_at: now,
        updated_at: now,
      })
      .eq("id", payload.id)
      .select("id,status,failure_reason,last_checked_at")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("官方地区价记录不存在。");

    clearOfficialCaches();
    return Response.json({ ok: true, price: data });
  } catch (error) {
    logApiError("admin official prices update", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "更新官方地区价失败。") },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}

async function updateEnabledRow(table: string, id: string, enabled: boolean) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase 尚未配置。");

  const { data, error } = await supabase
    .from(table)
    .update({
      enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,enabled")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("官方地区价配置不存在。");
  return data;
}

function clearOfficialCaches() {
  clearOfficialPricesCache();
  clearAdminDataCache();
  revalidatePath("/official-prices");
  revalidatePath("/official-prices/[id]", "page");
  revalidatePath("/admin");
  revalidatePath("/sitemap.xml");
}

function manualStatusReason(status: z.infer<typeof priceStatusSchema>): string {
  if (status === "missing") return "管理员标记为该地区/计划未提供。";
  if (status === "needs_review") return "管理员标记为需要复核。";
  if (status === "parse_failed") return "管理员标记为解析失败。";
  if (status === "stale") return "管理员标记为保留历史价格。";
  return "";
}
