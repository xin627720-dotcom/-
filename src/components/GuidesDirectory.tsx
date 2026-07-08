import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { guideCategories, guideEntries } from "@/lib/guides";

export function GuidesDirectory() {
  return (
    <section id="all-guides" className="mt-10">
      <div className="border-b border-[#dfe4e5] pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7a8182]">完整索引</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#202829]">全部指南</h2>
            <p className="mt-2 text-sm leading-7 text-[#5a6061]">
              这里保留一份轻量目录，方便读完快速入门后继续查找具体主题。
            </p>
          </div>
          <div className="text-sm font-semibold text-[#5a6061]">
            {guideEntries.length} 篇
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#dfe4e5]">
        {guideCategories.map((category) => {
          const entries = guideEntries.filter((guide) => guide.categoryId === category.id);

          return (
            <section key={category.id} className="grid gap-4 py-5 lg:grid-cols-[176px_minmax(0,1fr)]">
              <div>
                <h3 className="text-sm font-bold text-[#202829]">{category.label}</h3>
                <p className="mt-1 text-xs leading-5 text-[#7a8182]">{category.description}</p>
              </div>
              <div className="divide-y divide-[#edf0f1]">
                {entries.map((guide) => (
                  <Link
                    key={guide.href}
                    href={guide.href}
                    className="group grid gap-2 py-3 transition hover:bg-[#edf0f1]/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-2"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-[#202829]">{guide.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-[#5a6061]">{guide.intent}</span>
                    </span>
                    <span className="inline-flex items-center text-sm font-semibold text-[#2d3435]">
                      阅读
                      <ArrowRight size={15} className="ml-1 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
