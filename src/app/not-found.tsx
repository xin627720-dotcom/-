import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f9f9f9] text-[#2d3435]">
      <SiteHeader />
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[#5a6061]">404</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-normal text-[#202829]">
          没找到这个页面
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[#5a6061]">
          这个链接可能已经变更，或者对应的商品暂时不在公开目录里。
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#202829] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            返回首页
          </Link>
          <Link
            href="/guides"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#eef1f1] px-5 text-sm font-semibold text-[#2d3435] transition hover:bg-[#e3e9e9]"
          >
            查看指南
          </Link>
        </div>
      </section>
    </main>
  );
}
