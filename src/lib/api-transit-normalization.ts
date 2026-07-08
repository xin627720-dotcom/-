export type NormalizedTransitSubmissionUrl = {
  normalizedUrl: string | null;
  normalizedHost: string | null;
};

const TRACKING_PARAM_PREFIXES = ["utm_"];
const TRACKING_PARAMS = new Set([
  "_",
  "aff",
  "affiliate",
  "fbclid",
  "gclid",
  "invite",
  "priceai_credential",
  "promo",
  "ref",
  "referral",
  "spm",
  "t",
  "ts",
  "timestamp",
]);

export function normalizeTransitSubmissionUrl(value: string | null | undefined): NormalizedTransitSubmissionUrl {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { normalizedUrl: null, normalizedHost: null };
    }

    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      const normalizedKey = key.toLowerCase();
      if (
        TRACKING_PARAMS.has(normalizedKey) ||
        TRACKING_PARAM_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix))
      ) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();

    const normalizedHost = normalizeTransitSubmissionHost(url.hostname);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const normalizedUrl = `${url.protocol}//${url.host.toLowerCase()}${pathname}${url.search}`;
    return { normalizedUrl, normalizedHost };
  } catch {
    return { normalizedUrl: null, normalizedHost: null };
  }
}

export function normalizeTransitSubmissionHost(value: string | null | undefined): string | null {
  const host = String(value || "").trim().toLowerCase().replace(/^www\./, "");
  return host || null;
}
