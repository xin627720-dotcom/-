"use client";

import { useState } from "react";
import Image from "next/image";
import type { TransitStation } from "@/data/api-transit/types";
import {
  getTransitStationSystem,
  getTransitStationSystemLabel,
} from "@/lib/api-transit";
import { apiTransitLogoDisplayUrl } from "@/lib/api-transit-logo-url";

export function TransitStationSystemIcon({
  station,
  size = "md",
}: {
  station: TransitStation;
  size?: "md" | "lg";
}) {
  const system = getTransitStationSystem(station);
  const label = getTransitStationSystemLabel(station);
  const shellClassName = size === "lg" ? "h-14 w-14 rounded-xl" : "h-10 w-10 rounded-full";
  const imageClassName = size === "lg" ? "h-10 w-10" : "h-7 w-7";
  const customLogoUrl = apiTransitLogoDisplayUrl(station.logoUrl);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

  if (customLogoUrl && failedLogoUrl !== customLogoUrl) {
    return (
      <span
        className={`grid shrink-0 place-items-center bg-white ring-1 ring-[#adb3b4]/20 ${shellClassName}`}
        title={`${station.name} Logo`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={customLogoUrl}
          alt=""
          aria-hidden="true"
          className={`${imageClassName} object-contain`}
          onError={() => setFailedLogoUrl(customLogoUrl)}
        />
      </span>
    );
  }

  if (system === "new_api" || system === "sub_to_api") {
    const src = system === "new_api" ? "/brand-icons/new-api.png" : "/brand-icons/sub2api.png";

    return (
      <span
        className={`grid shrink-0 place-items-center bg-white ring-1 ring-[#adb3b4]/20 ${shellClassName}`}
        title={label}
      >
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          width={40}
          height={40}
          className={`${imageClassName} object-contain`}
        />
      </span>
    );
  }

  const initial = station.name.trim().charAt(0) || "?";

  return (
    <span
      className={`grid shrink-0 place-items-center bg-[#f2f4f4] text-sm font-bold text-[#202829] ring-1 ring-[#adb3b4]/15 ${shellClassName}`}
      title={label}
    >
      {initial}
    </span>
  );
}
