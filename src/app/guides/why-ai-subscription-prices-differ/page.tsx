import type { Metadata } from "next";
import { MdxGuidePage } from "@/components/MdxGuidePage";
import { buildMdxGuideMetadata } from "@/lib/mdx-guides";

export const revalidate = 86400;

const slug = "why-ai-subscription-prices-differ";

export function generateMetadata(): Promise<Metadata> {
  return buildMdxGuideMetadata(slug);
}

export default function WhyAiSubscriptionPricesDifferGuide() {
  return <MdxGuidePage slug={slug} />;
}
