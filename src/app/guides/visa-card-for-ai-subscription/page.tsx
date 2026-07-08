import type { Metadata } from "next";
import { MdxGuidePage } from "@/components/MdxGuidePage";
import { buildMdxGuideMetadata } from "@/lib/mdx-guides";

export const revalidate = 86400;

const slug = "visa-card-for-ai-subscription";

export function generateMetadata(): Promise<Metadata> {
  return buildMdxGuideMetadata(slug);
}

export default function VisaCardForAiSubscriptionGuide() {
  return <MdxGuidePage slug={slug} />;
}
