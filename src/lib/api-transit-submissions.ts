import "server-only";

import { normalizeTransitSubmissionUrl } from "@/lib/api-transit-normalization";
import { getSupabaseServerClient } from "@/lib/supabase";
import { stableId } from "@/lib/utils";

export type TransitSubmissionType = "user" | "merchant";
export type TransitSubmissionAccessMode = "public_only" | "test_key" | "test_account";

export type CreateTransitSubmissionInput = {
  type: TransitSubmissionType;
  stationId?: string | null;
  url: string;
  name?: string | null;
  apiBaseUrl?: string | null;
  pricingUrl?: string | null;
  contact?: string | null;
  notes?: string | null;
  models?: string[];
  meta?: Record<string, unknown>;
  accessMode?: TransitSubmissionAccessMode | null;
  submitterIp?: string | null;
  rateLimitPerHour?: number;
};

const DEFAULT_TRANSIT_SUBMISSION_RATE_LIMIT_PER_HOUR = 8;

export async function createTransitSubmission(input: CreateTransitSubmissionInput) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase 尚未配置，暂时无法接收提交。");

  const submittedUrl = normalizeUrl(input.url);
  const normalized = normalizeTransitSubmissionUrl(submittedUrl);
  const id = stableId("api-transit-submission", input.type, submittedUrl, input.submitterIp || "", new Date().toISOString());
  const existing = await findRecentSubmission({
    submittedUrl,
    normalizedUrl: normalized.normalizedUrl,
    normalizedHost: normalized.normalizedHost,
    submitterIp: input.submitterIp,
  });
  if (existing?.active) return { ignored: true as const, id: existing.id };

  await assertSubmitterRateLimit(input.submitterIp, input.rateLimitPerHour);

  await insertTransitSubmissionRow(supabase, {
    id,
    submission_type: input.type,
    submitted_url: submittedUrl,
    submitted_name: cleanText(input.name),
    api_base_url: cleanUrl(input.apiBaseUrl),
    pricing_url: cleanUrl(input.pricingUrl),
    contact: cleanText(input.contact),
    notes: cleanText(input.notes),
    submitted_models: input.models?.map((item) => item.trim()).filter(Boolean).slice(0, 30) || [],
    submitted_meta: buildSubmittedMeta(input),
    parse_status: "pending",
    probe_status: inferProbeStatus(input),
    review_status: "pending",
    station_id: cleanText(input.stationId),
    normalized_url: normalized.normalizedUrl,
    normalized_host: normalized.normalizedHost,
    duplicate_of: existing?.id || null,
    submitter_ip: input.submitterIp || null,
  });

  if (existing?.id) {
    await incrementDuplicateCount(existing.id);
  }
  return { id };
}

async function insertTransitSubmissionRow(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("api_transit_submissions").insert(row);
  if (!error) return;
  if (!isMissingColumnError(error)) throw error;

  const fallbackRow = { ...row };
  delete fallbackRow.normalized_url;
  delete fallbackRow.normalized_host;
  delete fallbackRow.duplicate_of;

  const { error: fallbackError } = await supabase.from("api_transit_submissions").insert(fallbackRow);
  if (fallbackError) throw fallbackError;
}

async function findRecentSubmission(input: {
  submittedUrl: string;
  normalizedUrl: string | null;
  normalizedHost: string | null;
  submitterIp?: string | null;
}): Promise<{ id: string; active: boolean } | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let recentQuery = supabase
    .from("api_transit_submissions")
    .select("id")
    .eq("submitted_url", input.submittedUrl)
    .gte("created_at", since)
    .limit(1);

  if (input.submitterIp) recentQuery = recentQuery.eq("submitter_ip", input.submitterIp);

  const { data, error } = await recentQuery.maybeSingle();
  if (error) throw error;
  if (data?.id) return { id: String(data.id), active: true };

  const normalizedMatch = await findNormalizedSubmission(input.normalizedUrl, input.normalizedHost);
  if (normalizedMatch) return { id: normalizedMatch, active: false };
  return null;
}

async function findNormalizedSubmission(normalizedUrl: string | null, normalizedHost: string | null): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase || (!normalizedUrl && !normalizedHost)) return null;

  if (normalizedUrl) {
    const { data, error } = await supabase
      .from("api_transit_submissions")
      .select("id")
      .eq("normalized_url", normalizedUrl)
      .in("review_status", ["pending", "collector_todo", "approved"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (isMissingColumnError(error)) return null;
      throw error;
    }
    if (data?.id) return String(data.id);
  }

  if (!normalizedHost) return null;
  const { data, error } = await supabase
    .from("api_transit_submissions")
    .select("id")
    .eq("normalized_host", normalizedHost)
    .in("review_status", ["pending", "collector_todo", "approved"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingColumnError(error)) return null;
    throw error;
  }
  return data?.id ? String(data.id) : null;
}

async function incrementDuplicateCount(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const { data, error } = await supabase
    .from("api_transit_submissions")
    .select("duplicate_count")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (isMissingColumnError(error)) return;
    throw error;
  }
  const nextCount = Number(data?.duplicate_count || 0) + 1;
  const { error: updateError } = await supabase
    .from("api_transit_submissions")
    .update({ duplicate_count: nextCount })
    .eq("id", id);
  if (updateError && !isMissingColumnError(updateError)) throw updateError;
}

async function assertSubmitterRateLimit(
  submitterIp: string | null | undefined,
  rateLimitPerHour = DEFAULT_TRANSIT_SUBMISSION_RATE_LIMIT_PER_HOUR,
): Promise<void> {
  if (!submitterIp || rateLimitPerHour <= 0) return;

  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("api_transit_submissions")
    .select("id", { count: "exact", head: true })
    .eq("submitter_ip", submitterIp)
    .gte("created_at", since);

  if (error) throw error;
  if ((count || 0) >= rateLimitPerHour) {
    throw new Error("提交过于频繁，请稍后再试。");
  }
}

function normalizeUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("链接仅支持 http 或 https。");
  }
  url.hash = "";
  return url.toString();
}

function cleanUrl(value: string | null | undefined): string | null {
  const text = cleanText(value);
  if (!text) return null;
  return normalizeUrl(text);
}

function cleanText(value: string | null | undefined): string | null {
  const text = String(value || "").trim();
  return text ? text : null;
}

function isMissingColumnError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      ((error as { code?: unknown }).code === "42703" || (error as { code?: unknown }).code === "PGRST204")
  );
}

function buildSubmittedMeta(input: CreateTransitSubmissionInput): Record<string, unknown> {
  const meta = { ...(input.meta || {}) };
  const accessMode = input.accessMode || stringValue(meta.accessMode) || "public_only";
  meta.accessMode = accessMode;
  if (accessMode === "test_key" || accessMode === "test_account") {
    meta.credentialStatus = "submitted";
    meta.credentialType = accessMode;
  }
  return meta;
}

function inferProbeStatus(input: CreateTransitSubmissionInput): "pending" | "public_pricing_found" | "needs_login" {
  if (input.pricingUrl || stringValue(input.meta?.monitorUrl)) return "public_pricing_found";
  if (input.accessMode === "test_account") return "needs_login";
  return "pending";
}

function stringValue(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
}
