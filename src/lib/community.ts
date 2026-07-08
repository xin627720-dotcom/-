export const qqGroupNumber = "761822700";
export const qqGroupUrl = "https://qm.qq.com/q/ze2W6ADwKk";
export const qqGroupQrCodeUrl = "/community/priceai-qq-group.png";
export const telegramUrl = "https://t.me/priceaicc";
export const qqGroupPromptEventName = "priceai:qq-group-open";

const qqGroupPromptHashes = new Set(["#qq-group", "#qqgroup"]);

export function wantsQQGroupFromSearch(queryString: string) {
  const params = new URLSearchParams(queryString);
  const qqGroup = params.get("qqGroup");
  if (qqGroup === "1" || qqGroup === "true" || qqGroup === "open") return true;
  return params.get("community") === "qq";
}

export function isQQGroupPromptHash(hash: string) {
  return qqGroupPromptHashes.has(hash.toLowerCase());
}

export function isQQGroupPromptUrl(value: string) {
  try {
    const url = new URL(value, "https://priceai.cc");
    const isInternal = value.startsWith("/") || url.hostname === "priceai.cc" || url.hostname === "www.priceai.cc";
    return isInternal && (wantsQQGroupFromSearch(url.search) || isQQGroupPromptHash(url.hash));
  } catch {
    return false;
  }
}

export function removeQQGroupPromptMarkers(pathname: string, queryString: string, hash: string) {
  const params = new URLSearchParams(queryString);
  params.delete("qqGroup");
  if (params.get("community") === "qq") params.delete("community");

  const nextQuery = params.toString();
  const nextHash = isQQGroupPromptHash(hash) ? "" : hash;
  return `${pathname}${nextQuery ? `?${nextQuery}` : ""}${nextHash}`;
}
