import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, FileText, ImageIcon, Megaphone, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { SiteHeader } from "@/components/SiteHeader";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "赞助位合作",
  description: "PriceAI 赞助位合作说明：面向正在比较 AI 订阅、官方 API 和中转 API 的用户，提供全站顶部横幅、首页生态位、频道赞助位和底部展示区。",
  alternates: {
    canonical: "/commercial",
  },
  openGraph: {
    title: "PriceAI 赞助位合作",
    description: "了解 PriceAI 可投放的赞助位置、适合对象、展示形式和投放资料要求。",
    url: "https://priceai.cc/commercial",
    siteName: "PriceAI",
  },
};

const slots = [
  {
    title: "全站顶部横幅",
    audience: "进入 PriceAI 任意公开页面、正在浏览价格或购买路径的用户。",
    fit: "云服务器、监控、开发者工具、域名、支付、算力、API 周边服务",
    format: "可关闭通知条，适合短期活动、品牌入口或重要更新。",
    note: "适合做轻提醒，不适合承载复杂说明。",
  },
  {
    title: "首页生态合作位",
    audience: "正在从首页进入卡网订阅、官方订阅、官方 API 或中转 API 的用户。",
    fit: "AI 周边服务、开发者基础设施、工具类品牌、长期合作公告",
    format: "首页模块之间的轻量图文位。",
    note: "适合做品牌说明和稳定曝光。",
  },
  {
    title: "底部赞助展示区",
    audience: "已经浏览完价格、风险说明或列表内容的用户。",
    fit: "IP 纯净度检测、云服务器、监控、支付、域名、网络与账号安全工具、API 中转周边服务",
    format: "页面最底部的多图片卡片位，可承接多个赞助对象。",
    note: "中转 API 相关服务可以放这里，但以广告展示为主。",
  },
  {
    title: "中转 API 频道赞助位",
    audience: "正在比较中转站价格、倍率、模型覆盖和稳定性的用户。",
    fit: "API Gateway、中转站、模型路由平台、公开可核验的优惠码",
    format: "频道页顶部或列表附近的横幅 / 图文卡片。",
    note: "适合引导到官网、价格页、监测页或优惠活动页。",
  },
  {
    title: "API 模型雷达合作位",
    audience: "正在比较官方 API、模型价格和开发者接入方案的用户。",
    fit: "模型 API、Token Plan、开发者工具、统一接口、模型路由相关服务",
    format: "模型 API 页面中的开发者向展示位。",
    note: "适合开发者向产品，不适合泛流量广告。",
  },
];

const sponsorUseCases = [
  ["品牌曝光", "让正在比较 AI 订阅、API 和中转服务的用户看到你的服务名称、定位和入口。"],
  ["活动引流", "承接优惠码、首充活动、新品发布或限时说明，把用户带回你的官网或活动页确认规则。"],
  ["资料承接", "把官网、定价页、监测页、文档、支持入口放到更容易被看到的位置。"],
  ["长期展示", "适合稳定服务、工具品牌和 API 周边服务做持续露出，而不是只靠一次公告。"],
];

const requirements = [
  "一句话说明你的服务解决什么问题，并提供官网或落地页。",
  "准备短标题、30 到 80 字说明、Logo、品牌图或赞助横幅图。",
  "说明希望出现的位置、展示周期、是否需要合同或发票。",
  "中转 API 相关服务建议附公开价格页、模型分组、充值倍率、监测页和支持入口。",
  "如果带优惠码，说明优惠规则和落地页即可，不需要在前台展示分佣比例。",
];

const materialSpecs = [
  ["主横幅图", "16:5，推荐 1600 x 500 px，最低 1200 x 375 px。"],
  ["文件格式", "PNG、JPG 或 WebP，建议小于 500 KB，背景不要透明。"],
  ["安全区", "关键 Logo 和文字放在中间 80% 区域，四周至少留 48 px。"],
  ["图片文字", "只放品牌名、短口号或活动关键词，详细说明放卡片标题和说明字段。"],
  ["落地页", "提供可公开访问的官网、活动页或文档页，不接受跳转链路不清晰的短链。"],
];

const boundaries = [
  "赞助位会明确标注为广告或赞助，避免被误解成 PriceAI 推荐。",
  "赞助不会改变价格、倍率、库存、稳定性、用户反馈和自然排序。",
  "不接受“官方推荐”“最稳定”“包可用”等无法核验或容易误导的表述。",
  "中转 API 可以展示优惠入口，但用户仍需回原站核验并小额试用。",
];

export default function CommercialPage() {
  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-body)]">
      <JsonLd data={buildCommercialJsonLd()} />
      <div className="sticky top-0 z-40 bg-[var(--color-page-translucent)] shadow-[var(--shadow-control)] backdrop-blur-xl">
        <SiteHeader />
      </div>

      <main>
        <section className="border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-[1500px] border-x border-[var(--color-border-soft)] px-5 py-12 sm:px-8 md:py-16">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-semibold text-[var(--color-success-text)]">赞助位合作</p>
              <h1 className="mt-5 text-balance font-serif text-[2.18rem] font-semibold leading-tight tracking-normal text-[var(--color-text-primary)] sm:text-5xl md:text-6xl">
                把你的服务展示给正在比较 AI 价格的人。
              </h1>
              <p className="mx-auto mt-5 max-w-[72ch] text-pretty text-base leading-8 text-[var(--color-text-muted)]">
                PriceAI 的赞助位适合展示云服务、开发者工具、网络检测、API Gateway、中转 API 周边服务。可以做品牌露出、优惠活动入口、资料页引流和长期合作展示。
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href="https://t.me/dimthink"
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-text-on-primary)] transition hover:bg-[var(--color-primary-hover)]"
                >
                  咨询赞助位
                  <ArrowRight size={16} />
                </a>
                <Link
                  href="#slots"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-panel)] px-6 text-sm font-semibold text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-soft)] transition hover:bg-[var(--color-surface-hover)]"
                >
                  查看投放位置
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-[1500px] border-x border-[var(--color-border-soft)] px-5 py-12 sm:px-8 md:py-14">
            <div className="mx-auto max-w-6xl">
              <p className="text-sm font-semibold text-[var(--color-success-text)]">赞助能做什么</p>
              <h2 className="mt-3 max-w-3xl text-balance font-serif text-3xl font-semibold tracking-normal text-[var(--color-text-primary)] sm:text-4xl">
                给合适的服务一个清晰入口。
              </h2>
              <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {sponsorUseCases.map(([title, body]) => (
                  <article key={title} className="rounded-lg bg-[var(--color-panel)] p-5 ring-1 ring-[var(--color-border-soft)]">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-soft)]">
                      <Megaphone size={17} />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="slots" className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="mx-auto max-w-[1500px] border-x border-[var(--color-border-soft)] px-5 py-12 sm:px-8 md:py-14">
            <div className="mx-auto max-w-6xl">
              <p className="text-sm font-semibold text-[var(--color-success-text)]">可投放位置</p>
              <h2 className="mt-3 max-w-3xl text-balance font-serif text-3xl font-semibold tracking-normal text-[var(--color-text-primary)] sm:text-4xl">
                按用户正在看的页面选择位置。
              </h2>
              <p className="mt-4 max-w-[72ch] text-sm leading-7 text-[var(--color-text-muted)]">
                不同位置适合不同投放目标：有的适合短活动，有的适合长期曝光，中转 API 相关服务更适合放在频道页、模型页或底部独立展示区。
              </p>
              <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {slots.map((slot) => (
                  <article key={slot.title} className="rounded-lg bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-soft)]">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-soft)]">
                        <Megaphone size={17} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{slot.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">{slot.audience}</p>
                      </div>
                    </div>
                    <dl className="mt-5 space-y-4">
                      <div>
                        <dt className="text-xs font-semibold text-[var(--color-success-text)]">适合投放</dt>
                        <dd className="mt-1 text-sm leading-7 text-[var(--color-text-body)]">{slot.fit}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-[var(--color-success-text)]">展示形式</dt>
                        <dd className="mt-1 text-sm leading-7 text-[var(--color-text-body)]">{slot.format}</dd>
                      </div>
                    </dl>
                    <p className="mt-4 border-t border-[var(--color-border-subtle)] pt-4 text-sm leading-7 text-[var(--color-text-muted)]">{slot.note}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="materials" className="border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-[1500px] border-x border-[var(--color-border-soft)] px-5 py-12 sm:px-8 md:py-14">
            <div className="mx-auto max-w-6xl">
              <p className="text-sm font-semibold text-[var(--color-success-text)]">素材交付标准</p>
              <h2 className="mt-3 max-w-3xl text-balance font-serif text-3xl font-semibold tracking-normal text-[var(--color-text-primary)] sm:text-4xl">
                一张横幅图，加一组清晰文案。
              </h2>
              <p className="mt-4 max-w-[72ch] text-sm leading-7 text-[var(--color-text-muted)]">
                PriceAI 的赞助卡会统一裁切为横向图片位。为了让不同赞助商放在一起时仍然整齐，建议所有投放素材按同一规格提交。
              </p>
              <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {materialSpecs.map(([title, body]) => (
                  <article key={title} className="rounded-lg bg-[var(--color-panel)] p-5 ring-1 ring-[var(--color-border-soft)]">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-soft)]">
                      <ImageIcon size={17} />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="rules" className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="mx-auto grid max-w-[1500px] gap-8 border-x border-[var(--color-border-soft)] px-5 py-12 sm:px-8 md:py-14 lg:grid-cols-2">
            <section className="rounded-lg bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-soft)]">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                <FileText size={18} />
                需要提供的信息
              </h2>
              <div className="mt-5 divide-y divide-[var(--color-border-subtle)]">
                {requirements.map((item) => (
                  <p key={item} className="py-3 text-sm leading-7 text-[var(--color-text-muted)]">
                    {item}
                  </p>
                ))}
              </div>
            </section>

            <section className="rounded-lg bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-soft)]">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                <ShieldCheck size={18} />
                投放规范
              </h2>
              <div className="mt-5 divide-y divide-[var(--color-border-subtle)]">
                {boundaries.map((item) => (
                  <p key={item} className="py-3 text-sm leading-7 text-[var(--color-text-muted)]">
                    {item}
                  </p>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-[1500px] border-x border-[var(--color-border-soft)] px-5 py-12 sm:px-8 md:py-14">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-lg bg-[var(--color-panel)] p-5 ring-1 ring-[var(--color-border-soft)] md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
                  <BadgeCheck size={18} />
                  投放前建议先准备资料
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">
                  把服务简介、落地页、展示周期和素材发来即可。中转 API 相关服务建议一并提供公开价格页、监测页、模型分组和支持入口，方便判断适合放频道页、模型页还是底部展示区。
                </p>
              </div>
              <a
                href="https://t.me/dimthink"
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-text-on-primary)] transition hover:bg-[var(--color-primary-hover)]"
              >
                发投放资料
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function buildCommercialJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "PriceAI 赞助位合作",
    url: "https://priceai.cc/commercial",
    inLanguage: "zh-CN",
    description: "说明 PriceAI 的赞助位、适合对象、展示形式和投放资料要求。",
    isPartOf: {
      "@type": "WebSite",
      name: "PriceAI",
      url: "https://priceai.cc",
    },
  };
}
