import type { EffectiveOfferStatus, FreshnessStatus, RawOffer } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const OFFER_VISIBLE_HOURS = 24;

export function freshnessFields(input: {
  method: "public_json" | "browser" | "http" | "manual";
  status: RawOffer["status"];
  verifiedAt: string;
}) {
  const priorityByMethod = {
    manual: 95,
    browser: 90,
    http: 85,
    public_json: 40,
  } satisfies Record<string, number>;
  const confidenceByMethod = {
    manual: 0.95,
    browser: 0.9,
    http: 0.85,
    public_json: 0.55,
  } satisfies Record<string, number>;
  const sourcePriority = priorityByMethod[input.method];
  const freshnessStatus: FreshnessStatus = "fresh";
  const effectiveStatus: EffectiveOfferStatus =
    input.status === "out_of_stock"
      ? "unavailable"
      : "available";

  return {
    source_status: input.status,
    effective_status: effectiveStatus,
    freshness_status: freshnessStatus,
    verified_at: input.verifiedAt,
    expires_at: new Date(
      new Date(input.verifiedAt).getTime() + OFFER_VISIBLE_HOURS * HOUR,
    ).toISOString(),
    source_priority: sourcePriority,
    confidence: confidenceByMethod[input.method],
  };
}
