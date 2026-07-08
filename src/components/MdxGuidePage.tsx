import { compileMDX } from "next-mdx-remote/rsc";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import remarkGfm from "remark-gfm";
import { GuideDocsLayout } from "@/components/GuideDocsLayout";
import { GuideReadingFooter } from "@/components/GuideReadingFooter";
import { JsonLd } from "@/components/JsonLd";
import { mdxGuideComponents } from "@/components/mdx-guide-components";
import { buildMdxGuideJsonLd, parseMdxGuideFrontmatter, readMdxGuide } from "@/lib/mdx-guides";

export async function MdxGuidePage({ slug }: { slug: string }) {
  const source = await readMdxGuide(slug);
  const compiled = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
    components: mdxGuideComponents,
  });
  const frontmatter = parseMdxGuideFrontmatter(compiled.frontmatter);

  return (
    <>
      <JsonLd data={buildMdxGuideJsonLd(frontmatter)} />
      <GuideDocsLayout currentHref={frontmatter.canonical}>
        <article className="pb-14">
          <header className="border-b border-[#dfe4e5] pb-8">
            {frontmatter.eyebrow ? (
              <p className="text-xs font-semibold text-[#2f7a4b]">{frontmatter.eyebrow}</p>
            ) : null}
            <h1 className="mt-4 max-w-[760px] font-serif text-4xl font-semibold leading-tight tracking-normal text-[#202829] sm:text-[2.75rem]">
              {frontmatter.title}
            </h1>
            <p className="mt-5 max-w-[72ch] text-base leading-8 text-[#5a6061]">{frontmatter.description}</p>
            {(frontmatter.primaryCta || frontmatter.secondaryCta) ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {frontmatter.primaryCta ? <HeaderCta href={frontmatter.primaryCta.href}>{frontmatter.primaryCta.label}</HeaderCta> : null}
                {frontmatter.secondaryCta ? (
                  <HeaderCta href={frontmatter.secondaryCta.href} variant="secondary">
                    {frontmatter.secondaryCta.label}
                  </HeaderCta>
                ) : null}
              </div>
            ) : null}
          </header>

          <div className="max-w-[78ch] pt-8">{compiled.content}</div>

          <GuideReadingFooter currentHref={frontmatter.canonical} />
        </article>
      </GuideDocsLayout>
    </>
  );
}

function HeaderCta({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
        variant === "primary"
          ? "bg-[#2d3435] text-[#f8f8f8] hover:bg-[#202829]"
          : "bg-[#edf0f1] text-[#2d3435] hover:bg-[#dde4e5]"
      }`}
    >
      {children}
      <ArrowRight size={15} />
    </Link>
  );
}
