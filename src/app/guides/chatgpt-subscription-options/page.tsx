import type { Metadata } from "next";
import { MdxGuidePage } from "@/components/MdxGuidePage";
import { buildMdxGuideMetadata } from "@/lib/mdx-guides";

export const revalidate = 86400;

const slug = "chatgpt-subscription-options";

export function generateMetadata(): Promise<Metadata> {
  return buildMdxGuideMetadata(slug);
}

export default function ChatGptSubscriptionOptionsGuide() {
  return <MdxGuidePage slug={slug} />;
}
