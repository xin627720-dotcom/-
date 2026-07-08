import { ArrowRight, BookOpenText, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  getGuideCategory,
  getGuideNavigationItems,
  getRelatedGuides,
} from "@/lib/guides";

export function GuideReadingFooter({ currentHref }: { currentHref: string }) {
  const relatedGuides = getRelatedGuides(currentHref, 3);
  const navigationItems = getGuideNavigationItems(currentHref);

  return (
    <section data-guide-no-toc className="mt-12 border-t border-[#dfe4e5] pt-5">
      <nav aria-label="指南连续阅读" className="grid gap-2 border-b border-[#dfe4e5] pb-5 sm:grid-cols-[1fr_auto_1fr]">
        <FooterNavLink direction="previous" item={navigationItems.previous} />
        <Link
          href="/guides"
          className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold text-[#2d3435] transition hover:bg-[#edf0f1]"
        >
          指南目录
        </Link>
        <FooterNavLink direction="next" item={navigationItems.next} />
      </nav>

      <div className="mt-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#7a8182]">
          <BookOpenText size={15} />
          相关推荐
        </div>
        <div className="mt-3 grid gap-2">
          {relatedGuides.map((guide) => {
            const category = getGuideCategory(guide.categoryId);

            return (
              <Link
                key={guide.href}
                href={guide.href}
                className="group flex items-start justify-between gap-4 rounded-md py-2 text-sm transition hover:bg-[#edf0f1] sm:px-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[#202829]">{guide.title}</span>
                  <span className="mt-0.5 block text-xs text-[#7a8182]">
                    {category?.label ?? "指南"} · {guide.intent}
                  </span>
                </span>
                <ArrowRight size={15} className="mt-1 shrink-0 text-[#7a8182] transition group-hover:translate-x-0.5 group-hover:text-[#2d3435]" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FooterNavLink({
  direction,
  item,
}: {
  direction: "previous" | "next";
  item: ReturnType<typeof getGuideNavigationItems>["previous"];
}) {
  const isPrevious = direction === "previous";
  const label = isPrevious ? "上一篇" : "下一篇";

  if (!item) {
    return (
      <span
        aria-disabled="true"
        className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-[#9aa1a2] ${
          isPrevious ? "justify-start" : "justify-start sm:justify-end"
        }`}
      >
        {isPrevious ? <ChevronLeft size={16} /> : null}
        <span>{label}</span>
        {!isPrevious ? <ChevronRight size={16} /> : null}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={`group inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[#202829] transition hover:bg-[#edf0f1] ${
        isPrevious ? "justify-start" : "justify-start sm:justify-end"
      }`}
    >
      {isPrevious ? <ChevronLeft size={16} className="shrink-0 transition group-hover:-translate-x-0.5" /> : null}
      <span className={isPrevious ? "min-w-0" : "min-w-0 sm:text-right"}>
        <span className="block text-xs font-semibold text-[#7a8182]">{label}</span>
        <span className="mt-0.5 block truncate">{item.label}</span>
      </span>
      {!isPrevious ? <ChevronRight size={16} className="shrink-0 transition group-hover:translate-x-0.5" /> : null}
    </Link>
  );
}
