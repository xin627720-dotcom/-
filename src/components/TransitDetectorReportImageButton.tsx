"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileJson, ImageDown, X } from "lucide-react";
import type { DetectorReportCheck, DetectorReportMetric, DetectorReportTone } from "@/lib/transit-detector-report";

export interface TransitDetectorReportImageData {
  id: string;
  title: string;
  protocolLabel: string;
  model: string;
  modeLabel: string;
  baseUrl: string;
  apiKeyMasked: string;
  timestampLabel: string;
  scoreLabel: string;
  verdictLabel: string;
  verdictTone: DetectorReportTone;
  summary: string;
  tierTitle: string;
  tierMessage: string;
  runError?: string;
  passCount: number;
  issueCount: number;
  skippedCount: number;
  metrics: DetectorReportMetric[];
  checks: DetectorReportCheck[];
  raw: unknown;
}

interface TransitDetectorReportDownloadButtonsProps {
  report: TransitDetectorReportImageData;
}

const SHARE_IMAGE_WIDTH = 1280;
const previewImageAlt = "API 中转检测报告长图预览";

export function TransitDetectorReportDownloadButtons({ report }: TransitDetectorReportDownloadButtonsProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const shareCardRef = useRef<HTMLDivElement>(null);
  const closePreviewButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isPreviewOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsPreviewOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => closePreviewButtonRef.current?.focus(), 0);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [isPreviewOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleJsonDownload() {
    const json = JSON.stringify(report.raw, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, `priceai-transit-report-${safeFilePart(report.id)}.json`);
  }

  async function handleOpenPreview() {
    if (isPreparing) return;
    const shareCardNode = shareCardRef.current;
    if (!shareCardNode) return;

    setIsPreparing(true);
    setErrorMessage("");

    try {
      const blob = await renderReportImage(shareCardNode);
      const nextUrl = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewBlob(blob);
      setPreviewUrl(nextUrl);
      setIsPreviewOpen(true);
    } catch {
      setErrorMessage("预览生成失败，请稍后再试。");
    } finally {
      setIsPreparing(false);
    }
  }

  function handleClosePreview() {
    setIsPreviewOpen(false);
  }

  function handleDownloadImage() {
    if (!previewBlob) return;
    downloadBlob(previewBlob, `priceai-transit-report-${safeFilePart(report.id)}.jpg`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleJsonDownload}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#202829] ring-1 ring-[#adb3b4]/18 transition hover:bg-[#f5f7f7]"
        >
          <FileJson className="h-4 w-4" />
          JSON
        </button>
        <button
          type="button"
          onClick={handleOpenPreview}
          disabled={isPreparing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#202829] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3435] disabled:cursor-wait disabled:bg-[#adb3b4]"
        >
          <ImageDown className="h-4 w-4" />
          {isPreparing ? "生成中" : "预览长图"}
        </button>
      </div>
      {errorMessage ? <span className="text-xs font-semibold text-[#9b3328]">{errorMessage}</span> : null}

      <div aria-hidden="true" className="pointer-events-none fixed top-0 left-[-20000px]">
        <div
          ref={shareCardRef}
          data-testid="transit-report-share-card"
          className="bg-[#f9f9f9] px-12 py-10 text-[#2d3435]"
          style={{ width: SHARE_IMAGE_WIDTH }}
        >
          <TransitDetectorReportLongImage report={report} />
        </div>
      </div>

      {isPreviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#202829]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detector-report-image-preview-title"
        >
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-[0_30px_80px_rgba(45,52,53,0.22)] ring-1 ring-[#adb3b4]/25">
            <div className="flex flex-col gap-3 border-b border-[#edf0f1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="detector-report-image-preview-title" className="text-lg font-semibold text-[#202829]">
                  长图预览
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#5a6061]">
                  这张长图由页面报告生成，可上下滚动检查。确认没问题后再下载；完整证据仍以页面报告为准。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#202829] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3435] disabled:cursor-not-allowed disabled:bg-[#adb3b4]"
                  disabled={!previewBlob}
                >
                  <Download className="h-4 w-4" />
                  下载 JPG
                </button>
                <button
                  type="button"
                  onClick={handleClosePreview}
                  ref={closePreviewButtonRef}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f4f4] text-[#5a6061] transition hover:bg-[#dfe4e5] hover:text-[#202829]"
                  aria-label="关闭图片预览"
                  title="关闭图片预览"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#f2f4f4] p-4 sm:p-5">
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Blob preview URLs cannot be optimized by next/image. */}
                  <img
                    src={previewUrl}
                    alt={previewImageAlt}
                    className="mx-auto h-auto w-full max-w-[920px] rounded-lg bg-white shadow-[0_10px_28px_rgba(45,52,53,0.10)]"
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TransitDetectorReportLongImage({ report }: { report: TransitDetectorReportImageData }) {
  const tone = toneClasses(report.verdictTone);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-8">
        <div className="flex items-center gap-4">
          <PriceAiMark />
          <div>
            <p className="text-[42px] leading-none font-extrabold tracking-normal text-[#202829]">PriceAI</p>
            <p className="mt-2 text-[15px] font-bold tracking-[0.18em] text-[#6b7374]">AI 比价雷达</p>
          </div>
        </div>
        <span className="inline-flex h-11 items-center rounded-full bg-white px-9 text-lg font-extrabold text-[#5a6061] shadow-[0_10px_30px_rgba(45,52,53,0.04)] ring-1 ring-[#adb3b4]/18">
          priceai.cc
        </span>
      </header>

      <div>
        <h1 className="font-serif text-[46px] leading-none font-semibold tracking-normal text-[#202829]">API 中转检测报告</h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-[17px] font-extrabold text-[#5a6061]">
          {[report.title, report.timestampLabel, report.protocolLabel].map((item) => (
            <span key={item} className="rounded-full bg-white px-4 py-2 shadow-[0_8px_18px_rgba(45,52,53,0.03)] ring-1 ring-[#adb3b4]/16">
              {item}
            </span>
          ))}
        </div>
        <p className="mt-4 max-w-[1040px] text-[18px] leading-[1.75] font-semibold text-[#5a6061]">
          这张长图由 PriceAI 报告页生成，用于快速分享检测结论和关键证据。完整原始返回仍以页面报告和 JSON 为准。
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(440px,1.1fr)] gap-5">
        <div className="rounded-lg bg-white p-6 shadow-[0_12px_34px_rgba(45,52,53,0.045)] ring-1 ring-[#adb3b4]/16">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[22px] font-extrabold text-[#5a6061]">综合结论</p>
              <div className="mt-4 flex items-end gap-4">
                <span className="text-[78px] leading-none font-extrabold tracking-normal text-[#202829]">{report.scoreLabel}</span>
                <span className={`mb-2 inline-flex h-11 items-center rounded-full px-5 text-[18px] font-extrabold ring-1 ${tone.pill}`}>
                  {report.verdictLabel}
                </span>
              </div>
            </div>
            <span className={`grid h-12 w-12 place-items-center rounded-full ${tone.iconBg}`}>
              <span className={`h-5 w-5 rounded-full ${tone.dot}`} />
            </span>
          </div>
          <p className="mt-4 text-[17px] leading-[1.65] font-bold text-[#2d3435]">
            {report.summary}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#edf0f1] pt-4">
            <ShareCount label="通过" value={report.passCount} tone="success" />
            <ShareCount label="需复核" value={report.issueCount} tone="warning" />
            <ShareCount label="未启用" value={report.skippedCount} tone="muted" />
          </div>
        </div>

        <div className="rounded-lg bg-white shadow-[0_12px_34px_rgba(45,52,53,0.045)] ring-1 ring-[#adb3b4]/16">
          <div className="border-b border-[#edf0f1] px-7 py-4">
            <h2 className="text-[24px] font-extrabold text-[#202829]">检测对象</h2>
          </div>
          <dl className="grid grid-cols-2">
            <ShareInfoCell label="模型" value={report.model} />
            <ShareInfoCell label="协议" value={report.protocolLabel} />
            <ShareInfoCell label="检测强度" value={report.modeLabel} />
            <ShareInfoCell label="接口地址" value={report.baseUrl} isCode />
            <ShareInfoCell label="Key" value={report.apiKeyMasked} isCode />
            <ShareInfoCell label="生成时间" value={report.timestampLabel} />
          </dl>
        </div>
      </div>

      {report.runError ? (
        <section className="rounded-lg bg-[#fff7e8] px-6 py-5 text-[17px] leading-[1.7] font-semibold text-[#7a541b] ring-1 ring-[#e7b65d]/30">
          <p className="text-[20px] font-extrabold">检测无效</p>
          <p className="mt-2">{report.runError}</p>
        </section>
      ) : null}

      <section className="rounded-lg bg-white shadow-[0_12px_34px_rgba(45,52,53,0.035)] ring-1 ring-[#adb3b4]/16">
        <div className="border-b border-[#edf0f1] px-6 py-5">
          <h2 className="text-[24px] font-extrabold text-[#202829]">报告说明</h2>
          <p className="mt-2 text-[17px] leading-[1.65] font-semibold text-[#5a6061]">{report.tierMessage}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 p-5">
          <SharePrincipleItem title={report.tierTitle} text="不同协议的检测强度不同，Claude 的签名信号和 OpenAI/Gemini 的协议信号不能混为一谈。" />
          <SharePrincipleItem title="证据链优先" text="报告展示每个检测项的状态、分数和关键证据，避免只看一个总分下结论。" />
          <SharePrincipleItem title="单次结果有边界" text="账号池、混合池或逆向线路可能波动，重要决策建议多次采样后再判断。" />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        {report.metrics.map((metric) => (
          <ShareMetricTile key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="rounded-lg bg-white shadow-[0_12px_34px_rgba(45,52,53,0.035)] ring-1 ring-[#adb3b4]/16">
        <div className="flex items-end justify-between gap-4 border-b border-[#edf0f1] px-6 py-5">
          <div>
            <h2 className="text-[24px] leading-none font-extrabold text-[#202829]">检测项证据</h2>
            <p className="mt-2 text-[16px] font-semibold text-[#5a6061]">每一项都保留状态、得分、耗时和关键字段，方便复核具体异常。</p>
          </div>
          <span className="text-[16px] font-extrabold text-[#5a6061]">{report.checks.length} 个检测项</span>
        </div>

        <div className="divide-y divide-[#edf0f1]">
          {report.checks.map((check) => (
            <ShareCheckRow key={check.name} check={check} />
          ))}
          {!report.checks.length ? (
            <p className="px-6 py-10 text-[18px] font-semibold text-[#5a6061]">本次报告没有可展示的检测项。请回到 PriceAI 页面查看原始报告是否完整返回。</p>
          ) : null}
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-[#dfe4e5] pt-5 text-[17px] font-bold text-[#5a6061]">
        <span>PriceAI API 中转模型检测长图 · 完整证据以页面报告为准</span>
        <span>{report.id} · {report.apiKeyMasked}</span>
      </footer>
    </section>
  );
}

function PriceAiMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-16 w-16 shrink-0 text-[#202829]">
      <circle cx="28" cy="28" r="20" fill="#ffffff" stroke="currentColor" strokeWidth="5" />
      <path d="M15 33L23 25L30 30L41 19" fill="none" stroke="#45bf78" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      <circle cx="41" cy="19" r="3.6" fill="#45bf78" />
      <path d="M43 43L56 56" stroke="currentColor" strokeLinecap="round" strokeWidth="7" />
    </svg>
  );
}

function ShareCount({ label, value, tone }: { label: string; value: number; tone: DetectorReportTone }) {
  const styles = toneClasses(tone);
  return (
    <div className={`rounded-lg px-4 py-2.5 ring-1 ${styles.soft}`}>
      <p className="text-[14px] font-extrabold">{label}</p>
      <p className="mt-1 text-[24px] leading-none font-extrabold text-[#202829]">{value}</p>
    </div>
  );
}

function ShareInfoCell({ label, value, isCode = false }: { label: string; value: string; isCode?: boolean }) {
  return (
    <div className="min-h-[78px] min-w-0 border-b border-[#edf0f1] px-7 py-3 odd:border-r odd:border-[#edf0f1]">
      <dt className="text-[13px] font-extrabold text-[#5a6061]">{label}</dt>
      <dd className={`mt-1 break-all text-[17px] leading-tight font-extrabold text-[#202829] ${isCode ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function SharePrincipleItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg bg-[#f7f8f8] px-5 py-4 ring-1 ring-[#adb3b4]/12">
      <p className="text-[18px] font-extrabold text-[#202829]">{title}</p>
      <p className="mt-2 text-[15px] leading-[1.65] font-semibold text-[#5a6061]">{text}</p>
    </div>
  );
}

function ShareCheckRow({ check }: { check: DetectorReportCheck }) {
  const styles = toneClasses(check.tone);
  return (
    <article className="grid gap-5 px-6 py-5 [grid-template-columns:minmax(260px,0.38fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${styles.dot}`} />
          <div className="min-w-0">
            <h3 className="text-[18px] leading-tight font-extrabold text-[#202829]">{check.label}</h3>
            <p className="mt-2 text-[14px] font-bold text-[#5a6061]">
              得分 {check.scoreLabel} · 耗时 {check.durationLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[16px] leading-[1.65] font-semibold text-[#2d3435]">{check.summary}</p>
          <span className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[14px] font-extrabold ring-1 ${styles.pill}`}>
            {check.status}
          </span>
        </div>
        {check.details.length ? (
          <dl className="mt-4 grid grid-cols-2 gap-2">
            {check.details.slice(0, 6).map((item) => (
              <div key={`${check.name}-${item.label}`} className="min-w-0 rounded-lg bg-[#f7f8f8] px-3 py-2 ring-1 ring-[#adb3b4]/10">
                <dt className="text-[12px] font-extrabold text-[#5a6061]">{item.label}</dt>
                <dd className="mt-1 break-words text-[14px] leading-[1.35] font-bold text-[#202829]">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </article>
  );
}

function ShareMetricTile({ metric }: { metric: DetectorReportMetric }) {
  const styles = toneClasses(metric.tone ?? "muted");
  return (
    <div className={`rounded-lg bg-white px-5 py-4 shadow-[0_16px_48px_rgba(45,52,53,0.045)] ring-1 ${metric.tone ? styles.softRing : "ring-[#adb3b4]/16"}`}>
      <p className="text-[15px] font-extrabold text-[#5a6061]">{metric.label}</p>
      <p className="mt-2 truncate text-[28px] leading-none font-extrabold text-[#202829]">{metric.value}</p>
      <p className="mt-2 text-[13px] leading-[1.35] font-semibold text-[#5a6061]">{metric.helper}</p>
    </div>
  );
}

async function renderReportImage(node: HTMLElement): Promise<Blob> {
  if ("fonts" in document) await document.fonts.ready;

  const rect = node.getBoundingClientRect();
  const width = Math.ceil(rect.width || SHARE_IMAGE_WIDTH);
  const height = Math.ceil(node.scrollHeight || rect.height);
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, {
    backgroundColor: "#f9f9f9",
    cacheBust: true,
    canvasHeight: height,
    canvasWidth: width,
    height,
    pixelRatio: 1,
    quality: 0.95,
    skipFonts: true,
    type: "image/jpeg",
    width,
  });

  if (!blob) throw new Error("Image rendering failed");
  return blob;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toneClasses(tone: DetectorReportTone) {
  if (tone === "success") {
    return {
      dot: "bg-[#45bf78]",
      iconBg: "bg-[#e8f3ec]",
      pill: "bg-[#e8f3ec] text-[#2f7a4b] ring-[#45bf78]/25",
      soft: "bg-[#f4fbf7] text-[#2f7a4b] ring-[#45bf78]/20",
      softRing: "ring-[#45bf78]/20",
    };
  }
  if (tone === "danger") {
    return {
      dot: "bg-[#c64c3f]",
      iconBg: "bg-[#fbe9e7]",
      pill: "bg-[#fbe9e7] text-[#9b3328] ring-[#e6b8b1]",
      soft: "bg-[#fff4f2] text-[#9b3328] ring-[#e6b8b1]",
      softRing: "ring-[#e6b8b1]",
    };
  }
  if (tone === "warning") {
    return {
      dot: "bg-[#e7a33e]",
      iconBg: "bg-[#fff7e8]",
      pill: "bg-[#fff7e8] text-[#7a541b] ring-[#e7b65d]/30",
      soft: "bg-[#fffaf0] text-[#7a541b] ring-[#e7b65d]/30",
      softRing: "ring-[#e7b65d]/30",
    };
  }
  return {
    dot: "bg-[#adb3b4]",
    iconBg: "bg-[#f2f4f4]",
    pill: "bg-[#f2f4f4] text-[#5a6061] ring-[#dfe4e5]",
    soft: "bg-[#f7f8f8] text-[#5a6061] ring-[#dfe4e5]",
    softRing: "ring-[#dfe4e5]",
  };
}

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "report";
}
