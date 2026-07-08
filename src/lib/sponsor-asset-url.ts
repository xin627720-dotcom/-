export const SPONSOR_ASSET_BUCKET_HOST = "sponsor-assets";
export const SPONSOR_ASSET_URL_PREFIX = `r2://${SPONSOR_ASSET_BUCKET_HOST}/`;

export function sponsorAssetDisplayUrl(value: string | null | undefined): string | null {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.startsWith(SPONSOR_ASSET_URL_PREFIX)) {
    return `/api/sponsor-assets?ref=${encodeURIComponent(text)}`;
  }
  return text;
}
