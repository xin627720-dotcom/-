import collectorRegistry from "../../config/collectors.json";
import type { CollectorKind } from "./types";

type CollectorRegistryEntry = {
  kind: CollectorKind;
  label: string;
  hosts: string[];
};

const registryEntries = collectorRegistry.kinds as CollectorRegistryEntry[];
const hostSets = new Map<CollectorKind, Set<string>>();

export const collectorKindOptions: Array<[CollectorKind, string]> = [
  ["auto", "自动识别"],
  ...registryEntries.map((entry) => [entry.kind, entry.label] as [CollectorKind, string]),
  ["browser", "本机浏览器"],
  ["unsupported", "暂不支持"],
];

export const collectorKindValues = collectorKindOptions.map(([kind]) => kind);

export function collectorHostsForKind(kind: CollectorKind): Set<string> {
  const cached = hostSets.get(kind);
  if (cached) return cached;

  const hosts = new Set(
    (registryEntries.find((entry) => entry.kind === kind)?.hosts || [])
      .map((host) => normalizeCollectorHost(host)),
  );
  hostSets.set(kind, hosts);
  return hosts;
}

export function knownAutoCollectorHosts(): Set<string> {
  return new Set(registryEntries.flatMap((entry) => entry.hosts.map((host) => normalizeCollectorHost(host))));
}

export function collectorKindLabel(value: string): string {
  return collectorKindOptions.find(([kind]) => kind === value)?.[1] || value;
}

export function isCollectorKind(value: string | null | undefined): value is CollectorKind {
  return Boolean(value && collectorKindValues.includes(value as CollectorKind));
}

export function normalizeCollectorKind(value: unknown): CollectorKind | null {
  return typeof value === "string" && isCollectorKind(value.trim()) ? value.trim() as CollectorKind : null;
}

export function inferCollectorKindFromHost(
  hostOrUrl: string,
  text = "",
  fallback: CollectorKind | null = null,
): CollectorKind | null {
  const host = normalizeCollectorHost(hostOrUrl);
  for (const entry of registryEntries) {
    if (collectorHostsForKind(entry.kind).has(host)) return entry.kind;
  }
  if (text.toLowerCase().includes("burstpro")) return "dujiao";
  return fallback;
}

function normalizeCollectorHost(value: string): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}
