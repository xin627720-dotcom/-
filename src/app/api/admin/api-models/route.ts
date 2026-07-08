import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { clearApiModelDatasetCache, updateApiProviderSubmissionReview } from "@/lib/api-models-db";
import { clearAdminDataCache } from "@/lib/data";
import { requireAdminRequest } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const priceValueSchema = z.union([
  z.object({
    kind: z.literal("numeric"),
    usdPerMTokens: z.number().finite().nonnegative().optional(),
    cnyPerMTokens: z.number().finite().nonnegative().optional(),
    label: z.string().trim().max(120).optional(),
  }).refine((value) => typeof value.usdPerMTokens === "number" || typeof value.cnyPerMTokens === "number" || Boolean(value.label), {
    message: "数值价格至少需要填写 USD、CNY 或标签。",
  }),
  z.object({
    kind: z.literal("text"),
    text: z.string().trim().min(1).max(300),
  }),
]);

const patchSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("model"),
    id: z.string().min(1),
    displayName: z.string().trim().min(1).max(120),
    modelId: z.string().trim().min(1).max(160),
    contextWindow: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(1000),
    status: z.enum(["active", "inactive", "needs_review"]),
    sourceUrl: z.string().trim().url(),
    sourceLabel: z.string().trim().min(1).max(120),
    capabilities: z.array(z.string().trim().min(1).max(60)).max(30),
    suitableTools: z.array(z.string().trim().min(1).max(60)).max(30),
  }),
  z.object({
    target: z.literal("provider"),
    id: z.string().min(1),
    name: z.string().trim().min(1).max(160).optional(),
    type: z.enum(["official", "router", "free", "subscription"]).optional(),
    billingMode: z.enum(["按量计费", "免费/测试", "订阅套餐", "动态路由"]).optional(),
    url: z.string().trim().url().optional(),
    pricingUrl: z.string().trim().url().nullable().optional(),
    description: z.string().trim().max(1000).optional(),
    limitSummary: z.string().trim().max(1000).optional(),
    limitations: z.string().trim().max(1200).optional(),
    sourceLabel: z.string().trim().min(1).max(120).optional(),
    enabled: z.boolean().optional(),
  }),
  z.object({
    target: z.literal("plan"),
    id: z.string().min(1),
    name: z.string().trim().min(1).max(160),
    type: z.enum(["official", "router", "free", "subscription"]),
    priceLabel: z.string().trim().max(200),
    priceUsdMonthly: z.number().finite().nonnegative().nullable().optional(),
    priceCnyMonthly: z.number().finite().nonnegative().nullable().optional(),
    quotaSummary: z.string().trim().max(1200),
    resetSummary: z.string().trim().max(1000),
    limitSummary: z.string().trim().max(1000),
    limitations: z.string().trim().max(1200),
    coverageLabel: z.string().trim().max(1000).nullable().optional(),
    compatibility: z.array(z.string().trim().min(1).max(80)).max(30),
    suitableTools: z.array(z.string().trim().min(1).max(80)).max(30),
    sourceUrl: z.string().trim().url(),
    sourceLabel: z.string().trim().min(1).max(120),
    enabled: z.boolean(),
    modelIds: z.array(z.string().trim().min(1).max(120)).max(80),
  }),
  z.object({
    target: z.literal("offer"),
    id: z.string().min(1),
    routeModelId: z.string().trim().max(160).nullable().optional(),
    inputPrice: priceValueSchema.optional(),
    outputPrice: priceValueSchema.optional(),
    cacheReadPrice: priceValueSchema.nullable().optional(),
    cacheWritePrice: priceValueSchema.nullable().optional(),
    freeOrPlan: z.string().trim().max(1000).optional(),
    limitSummary: z.string().trim().max(1000).optional(),
    limitations: z.string().trim().max(1200).optional(),
    compatibility: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    suitableTools: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    pricingUrl: z.string().trim().url().nullable().optional(),
    sourceLabel: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["active", "inactive", "needs_review"]),
    notes: z.string().trim().max(1200).nullable().optional(),
  }),
  z.object({
    target: z.literal("submission"),
    id: z.string().min(1),
    reviewStatus: z.enum(["pending", "approved", "collector_todo", "rejected"]),
    adminNote: z.string().trim().max(500).optional().nullable(),
  }),
]);

export async function PATCH(request: Request) {
  try {
    await requireAdminRequest(request);
    const payload = patchSchema.parse(await request.json());
    const supabase = getSupabaseServerClient();
    if (!supabase) throw new Error("Supabase 尚未配置，无法更新 API 模型数据。");

    if (payload.target === "submission") {
      const submission = await updateApiProviderSubmissionReview({
        id: payload.id,
        reviewStatus: payload.reviewStatus,
        adminNote: payload.adminNote ?? null,
      });
      clearApiModelCaches();
      return Response.json({ ok: true, submission });
    }

    if (payload.target === "model") {
      const { data, error } = await supabase
        .from("api_models")
        .update({
          display_name: payload.displayName,
          model_id: payload.modelId,
          context_window: payload.contextWindow || null,
          description: payload.description,
          status: payload.status,
          source_url: payload.sourceUrl,
          source_label: payload.sourceLabel,
          capabilities: payload.capabilities,
          suitable_tools: payload.suitableTools,
          data_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select("id,display_name,model_id,status")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("API 模型不存在。");
      clearApiModelCaches();
      return Response.json({ ok: true, model: data });
    }

    if (payload.target === "provider") {
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (typeof payload.name === "string") update.name = payload.name;
      if (payload.type) update.type = payload.type;
      if (payload.billingMode) update.billing_mode = payload.billingMode;
      if (typeof payload.url === "string") update.official_url = payload.url;
      if ("pricingUrl" in payload) update.pricing_url = payload.pricingUrl || null;
      if (typeof payload.description === "string") update.description = payload.description;
      if (typeof payload.limitSummary === "string") update.limit_summary = payload.limitSummary;
      if (typeof payload.limitations === "string") update.limitations = payload.limitations;
      if (typeof payload.sourceLabel === "string") update.source_label = payload.sourceLabel;
      if (typeof payload.enabled === "boolean") update.enabled = payload.enabled;
      if (Object.keys(update).length > 1) update.data_updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("api_providers")
        .update(update)
        .eq("id", payload.id)
        .select("id,name,enabled,type,billing_mode")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("API 来源不存在。");
      clearApiModelCaches();
      return Response.json({ ok: true, provider: data });
    }

    if (payload.target === "plan") {
      const { data, error } = await supabase
        .from("api_plans")
        .update({
          name: payload.name,
          type: payload.type,
          price_label: payload.priceLabel,
          price_usd_monthly: payload.priceUsdMonthly ?? null,
          price_cny_monthly: payload.priceCnyMonthly ?? null,
          quota_summary: payload.quotaSummary,
          reset_summary: payload.resetSummary,
          limit_summary: payload.limitSummary,
          limitations: payload.limitations,
          coverage_label: payload.coverageLabel || null,
          compatibility: payload.compatibility,
          suitable_tools: payload.suitableTools,
          source_url: payload.sourceUrl,
          source_label: payload.sourceLabel,
          enabled: payload.enabled,
          data_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select("id,name,enabled")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("API 套餐不存在。");

      await supabase.from("api_plan_models").delete().eq("plan_id", payload.id);
      if (payload.modelIds.length) {
        const { error: planModelError } = await supabase
          .from("api_plan_models")
          .upsert(payload.modelIds.map((modelId) => ({ plan_id: payload.id, model_id: modelId })), { onConflict: "plan_id,model_id" });
        if (planModelError) throw planModelError;
      }

      clearApiModelCaches();
      return Response.json({ ok: true, plan: data });
    }

    const offerUpdate: Record<string, unknown> = {
      status: payload.status,
      updated_at: new Date().toISOString(),
    };
    if ("routeModelId" in payload) offerUpdate.route_model_id = payload.routeModelId || null;
    if (payload.inputPrice) offerUpdate.input_price = payload.inputPrice;
    if (payload.outputPrice) offerUpdate.output_price = payload.outputPrice;
    if ("cacheReadPrice" in payload) offerUpdate.cache_read_price = payload.cacheReadPrice ?? null;
    if ("cacheWritePrice" in payload) offerUpdate.cache_write_price = payload.cacheWritePrice ?? null;
    if (typeof payload.freeOrPlan === "string") offerUpdate.free_or_plan = payload.freeOrPlan;
    if (typeof payload.limitSummary === "string") offerUpdate.limit_summary = payload.limitSummary;
    if (typeof payload.limitations === "string") offerUpdate.limitations = payload.limitations;
    if (payload.compatibility) offerUpdate.compatibility = payload.compatibility;
    if (payload.suitableTools) offerUpdate.suitable_tools = payload.suitableTools;
    if ("pricingUrl" in payload) offerUpdate.pricing_url = payload.pricingUrl || null;
    if (typeof payload.sourceLabel === "string") offerUpdate.source_label = payload.sourceLabel;
    if ("notes" in payload) offerUpdate.notes = payload.notes || null;
    if (Object.keys(offerUpdate).length > 2) {
      offerUpdate.collected_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("api_model_offers")
      .update(offerUpdate)
      .eq("id", payload.id)
      .select("id,status")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("API 模型报价不存在。");
    clearApiModelCaches();
    return Response.json({ ok: true, offer: data });
  } catch (error) {
    logApiError("admin api models update", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "更新 API 模型数据失败。") },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}

function clearApiModelCaches() {
  clearApiModelDatasetCache();
  clearAdminDataCache();
  revalidatePath("/api-models");
  revalidatePath("/api-models/[id]", "page");
  revalidatePath("/api-models/providers/[id]", "page");
  revalidatePath("/sitemap.xml");
}
