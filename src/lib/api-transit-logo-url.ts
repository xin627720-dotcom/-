export const API_TRANSIT_LOGO_BUCKET_HOST = "api-transit-logo";
export const API_TRANSIT_LOGO_URL_PREFIX = `r2://${API_TRANSIT_LOGO_BUCKET_HOST}/`;

export function apiTransitLogoDisplayUrl(value: string | null | undefined): string | null {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.startsWith(API_TRANSIT_LOGO_URL_PREFIX)) {
    return `/api/api-transit/logo?ref=${encodeURIComponent(text)}`;
  }
  return text;
}
