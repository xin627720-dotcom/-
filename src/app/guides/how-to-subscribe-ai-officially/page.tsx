import type { Metadata } from "next";
import { MdxGuidePage } from "@/components/MdxGuidePage";
import { buildMdxGuideMetadata } from "@/lib/mdx-guides";

export const revalidate = 86400;

const slug = "how-to-subscribe-ai-officially";

export function generateMetadata(): Promise<Metadata> {
  return buildMdxGuideMetadata(slug);
}

export default function HowToSubscribeAiOfficiallyGuide() {
  return <MdxGuidePage slug={slug} />;
}
