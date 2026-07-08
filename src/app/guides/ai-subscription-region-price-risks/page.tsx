import type { Metadata } from "next";
import { MdxGuidePage } from "@/components/MdxGuidePage";
import { buildMdxGuideMetadata } from "@/lib/mdx-guides";

export const revalidate = 86400;

const slug = "ai-subscription-region-price-risks";

export function generateMetadata(): Promise<Metadata> {
  return buildMdxGuideMetadata(slug);
}

export default function AiSubscriptionRegionPriceRisksGuide() {
  return <MdxGuidePage slug={slug} />;
}
