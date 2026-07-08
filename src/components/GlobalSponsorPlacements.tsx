"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SponsoredPlacementPreview } from "@/components/SponsoredPlacementPreview";
import type { SponsorSettingsSummary } from "@/lib/sponsor-settings-shared";

const topBannerExcludedPathPrefixes = [
  "/admin",
  "/support",
] as const;

const footerExcludedPathPrefixes = [
  "/admin",
  "/commercial",
  "/support",
  "/api-transit/submit",
  "/api-transit/detector/reports",
] as const;

export function GlobalSponsorPlacements({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sponsorSettings, setSponsorSettings] = useState<SponsorSettingsSummary | null>(null);

  const shouldHideTopBanner = matchesPathPrefix(pathname, topBannerExcludedPathPrefixes);
  const shouldHideFooter = matchesPathPrefix(pathname, footerExcludedPathPrefixes);
  const shouldFetchSponsorSettings = !shouldHideTopBanner || !shouldHideFooter;

  useEffect(() => {
    if (!shouldFetchSponsorSettings) return;

    let cancelled = false;
    fetch("/api/sponsor-settings")
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && payload?.ok) setSponsorSettings(payload.settings as SponsorSettingsSummary);
      })
      .catch(() => {
        if (!cancelled) setSponsorSettings(null);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldFetchSponsorSettings]);

  return (
    <>
      {shouldHideTopBanner ? null : (
        <SponsoredPlacementPreview
          kind="topBanner"
          settings={sponsorSettings}
        />
      )}
      {children}
      {shouldHideFooter ? null : (
        <SponsoredPlacementPreview
          kind="listFooter"
          settings={sponsorSettings}
          className="mx-auto mb-8 w-[calc(100%-2.5rem)] max-w-[1500px] sm:w-[calc(100%-4rem)]"
        />
      )}
    </>
  );
}

function matchesPathPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
