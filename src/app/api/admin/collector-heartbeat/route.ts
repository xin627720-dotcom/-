import { clearAdminDataCache } from "@/lib/data";
import { requireAdminOrCronRequest } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase";
import { z } from "zod";

const nodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  type: z.string().optional().nullable(),
  runtime: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
});

const heartbeatSchema = z.object({
  node: nodeSchema,
  scope: z.string().optional().nullable(),
  status: z.enum(["running", "success", "partial", "failed", "idle", "unknown"]).default("unknown"),
  startedAt: z.string().datetime().optional().nullable(),
  finishedAt: z.string().datetime().optional().nullable(),
  successCount: z.number().int().nonnegative().optional().default(0),
  failureCount: z.number().int().nonnegative().optional().default(0),
  skippedCount: z.number().int().nonnegative().optional().default(0),
  offerCount: z.number().int().nonnegative().optional().default(0),
  message: z.string().optional().nullable(),
  details: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    await requireAdminOrCronRequest(request);

    const supabase = getSupabaseServerClient();
    if (!supabase) throw new Error("Supabase 尚未配置，无法保存采集节点心跳。");

    const payload = heartbeatSchema.parse(await request.json());
    const now = new Date().toISOString();
    const row = {
      node_id: payload.node.id,
      node_name: payload.node.name || payload.node.id,
      node_type: payload.node.type || null,
      runtime: payload.node.runtime || null,
      region: payload.node.region || null,
      scope: payload.scope || null,
      status: payload.status,
      started_at: payload.startedAt || null,
      finished_at: payload.finishedAt || null,
      last_seen_at: now,
      success_count: payload.successCount,
      failure_count: payload.failureCount,
      skipped_count: payload.skippedCount,
      offer_count: payload.offerCount,
      message: payload.message || null,
      details: payload.details || null,
      updated_at: now,
    };

    const { error } = await supabase
      .from("collector_heartbeats")
      .upsert(row, { onConflict: "node_id" });

    if (error) throw error;

    clearAdminDataCache();

    return Response.json({ ok: true, nodeId: payload.node.id, lastSeenAt: now });
  } catch (error) {
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "记录采集节点心跳失败。" },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
