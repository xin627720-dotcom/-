import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { z } from "zod";
import { mdxGuideSources } from "@/lib/generated-mdx-guides";

const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  eyebrow: z.string().optional(),
  categoryId: z.enum(["basics", "official", "payment", "channels"]),
  tags: z.array(z.string()).default([]),
  intent: z.string().optional(),
  canonical: z.string(),
  primaryCta: z
    .object({
      href: z.string(),
      label: z.string(),
    })
    .optional(),
  secondaryCta: z
    .object({
      href: z.string(),
      label: z.string(),
    })
    .optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
});

export type MdxGuideFrontmatter = z.infer<typeof frontmatterSchema>;

export async function readMdxGuide(slug: string) {
  const source = mdxGuideSources[slug as keyof typeof mdxGuideSources];
  if (!source) {
    throw new Error(`Unknown MDX guide slug: ${slug}`);
  }
  return source;
}

export function parseMdxGuideFrontmatter(frontmatter: unknown) {
  return frontmatterSchema.parse(frontmatter);
}

export async function buildMdxGuideMetadata(slug: string): Promise<Metadata> {
  const source = await readMdxGuide(slug);
  const compiled = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  });
  const frontmatter = parseMdxGuideFrontmatter(compiled.frontmatter);

  return {
    title: frontmatter.title,
    description: frontmatter.description,
    alternates: {
      canonical: frontmatter.canonical,
    },
    openGraph: {
      title: `${frontmatter.title} | PriceAI`,
      description: frontmatter.description,
      url: `https://priceai.cc${frontmatter.canonical}`,
    },
  };
}

export function buildMdxGuideJsonLd(frontmatter: MdxGuideFrontmatter) {
  const pageUrl = `https://priceai.cc${frontmatter.canonical}`;
  const items: unknown[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: frontmatter.title,
      inLanguage: "zh-CN",
      url: pageUrl,
      description: frontmatter.description,
      author: {
        "@type": "Organization",
        name: "PriceAI",
      },
      publisher: {
        "@type": "Organization",
        name: "PriceAI",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "PriceAI", item: "https://priceai.cc" },
        { "@type": "ListItem", position: 2, name: "指南", item: pageUrl },
      ],
    },
  ];

  if (frontmatter.faq.length) {
    items.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: frontmatter.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return items;
}
