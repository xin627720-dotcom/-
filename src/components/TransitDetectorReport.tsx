import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Gauge,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { TransitDetectorReportDownloadButtons } from "@/components/TransitDetectorReportImageButton";
import type { DetectorReportCheck, DetectorReportMetric, DetectorReportTone, DetectorReportView } from "@/lib/transit-detector-report";

interface TransitDetectorReportProps {
  report: DetectorReportView;
}

export function TransitDetectorReport({ report }: TransitDetectorReportProps) {
  const toneClass = getToneClass(report.verdictTone);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-[960px]">
          <Link
            href="/api-transit/detector"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5a6061] transition hover:text-[#202829]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回模型检测
          </Link>
          <h1 className="font-serif text-2xl font-semibold tracking-normal text-[#202829] md:text-4xl">
            API 中转检测报告
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5a6061]">
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#adb3b4]/15">{report.title}</span>
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#adb3b4]/15">{report.timestampLabel}</span>
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#adb3b4]/15">{report.protocolLabel}</span>
          </div>
          <p className="mt-3 max-w-[860px] text-sm leading-[1.8] text-[#5a6061]">
            这份报告由 PriceAI 检测服务生成，主站只展示报告证据链，不保存你的 API Key。结论用于辅助判断接口协议、模型能力和计费口径，不代表对商家做担保。
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <Link
            href="/api-transit/detector"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#202829] ring-1 ring-[#adb3b4]/18 transition hover:bg-[#f5f7f7]"
          >
            <RotateCcw className="h-4 w-4" />
            重新检测
          </Link>
          <TransitDetectorReportDownloadButtons report={report} />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <div className="rounded-lg bg-white p-5 ring-1 ring-[#adb3b4]/15">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#5a6061]">综合结论</p>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-normal text-[#202829]">{report.scoreLabel}</span>
                <span className={`mb-2 inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold ring-1 ${toneClass.pill}`}>
                  {report.verdictLabel}
                </span>
              </div>
            </div>
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${toneClass.iconBg}`}>
              {getToneIcon(report.verdictTone, "h-5 w-5")}
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-[#2d3435]">{report.summary}</p>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#edf0f1] pt-4">
            <SummaryCount label="通过" value={report.passCount} tone="success" />
            <SummaryCount label="需复核" value={report.issueCount} tone="warning" />
            <SummaryCount label="未启用" value={report.skippedCount} tone="muted" />
          </div>
        </div>

        <div className="rounded-lg bg-white ring-1 ring-[#adb3b4]/15">
          <div className="border-b border-[#edf0f1] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#202829]">检测对象</h2>
          </div>
          <dl className="grid gap-0 sm:grid-cols-2">
            <InfoRow label="模型" value={report.model} />
            <InfoRow label="协议" value={report.protocolLabel} />
            <InfoRow label="检测强度" value={report.modeLabel} />
            <InfoRow label="接口地址" value={report.baseUrl} isCode />
            <InfoRow label="Key" value={report.apiKeyMasked} isCode />
            <InfoRow label="生成时间" value={report.timestampLabel} />
          </dl>
        </div>
      </section>

      {report.runError ? (
        <section className="rounded-lg bg-[#fff7e8] px-5 py-4 text-sm leading-7 text-[#7a541b] ring-1 ring-[#e7b65d]/30">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">检测无效</p>
              <p className="mt-1">{report.runError}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg bg-white ring-1 ring-[#adb3b4]/15">
        <div className="border-b border-[#edf0f1] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#202829]">报告说明</h2>
          <p className="mt-1 text-sm leading-6 text-[#5a6061]">{report.tierMessage}</p>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-3">
          <PrincipleItem icon={<Gauge className="h-4 w-4" />} title={report.tierTitle} text="不同协议的检测强度不同，Claude 的签名信号和 OpenAI/Gemini 的协议信号不能混为一谈。" />
          <PrincipleItem icon={<Copy className="h-4 w-4" />} title="证据链优先" text="报告展示每个检测项的状态、分数和关键证据，避免只看一个总分下结论。" />
          <PrincipleItem icon={<Clock3 className="h-4 w-4" />} title="单次结果有边界" text="账号池、混合池或逆向线路可能波动，重要决策建议多次采样后再判断。" />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {report.metrics.map((metric) => (
          <MetricTile key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="rounded-lg bg-white ring-1 ring-[#adb3b4]/15">
        <div className="flex flex-col gap-2 border-b border-[#edf0f1] px-5 py-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#202829]">检测项证据</h2>
            <p className="mt-1 text-sm leading-6 text-[#5a6061]">每一项都保留状态、得分、耗时和关键字段，方便复核具体异常。</p>
          </div>
          <span className="text-xs font-semibold text-[#5a6061]">{report.checks.length} 个检测项</span>
        </div>

        <div className="divide-y divide-[#edf0f1]">
          {report.checks.map((check) => (
            <CheckRow key={check.name} check={check} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function TransitDetectorReportUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg bg-white px-5 py-10 text-center ring-1 ring-[#adb3b4]/15">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff7e8] text-[#7a541b]">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h1 className="mt-4 font-serif text-2xl font-semibold tracking-normal text-[#202829]">{title}</h1>
      <p className="mx-auto mt-3 max-w-[620px] text-sm leading-7 text-[#5a6061]">{message}</p>
      <div className="mt-6 flex justify-center">
        <Link
          href="/api-transit/detector"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#202829] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3435]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回模型检测
        </Link>
      </div>
    </div>
  );
}

function SummaryCount({ label, value, tone }: { label: string; value: number; tone: DetectorReportTone }) {
  const className = getToneClass(tone);
  return (
    <div className={`rounded-lg px-3 py-2 ring-1 ${className.soft}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#202829]">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, isCode = false }: { label: string; value: string; isCode?: boolean }) {
  return (
    <div className="border-b border-[#edf0f1] px-5 py-4 last:border-b-0 sm:border-r sm:even:border-r-0">
      <dt className="text-xs font-semibold text-[#5a6061]">{label}</dt>
      <dd className={`mt-1 break-all text-sm font-semibold text-[#202829] ${isCode ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function MetricTile({ metric }: { metric: DetectorReportMetric }) {
  const tone = getToneClass(metric.tone ?? "muted");
  return (
    <div className={`rounded-lg bg-white p-4 ring-1 ${metric.tone ? tone.soft : "ring-[#adb3b4]/15"}`}>
      <p className="text-xs font-semibold text-[#5a6061]">{metric.label}</p>
      <p className="mt-2 text-xl font-semibold text-[#202829]">{metric.value}</p>
      <p className="mt-1 text-xs leading-5 text-[#5a6061]">{metric.helper}</p>
    </div>
  );
}

function CheckRow({ check }: { check: DetectorReportCheck }) {
  const tone = getToneClass(check.tone);

  return (
    <article className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(220px,0.42fr)_minmax(0,1fr)]">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.iconBg}`}>
          {getToneIcon(check.tone, "h-4 w-4")}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[#202829]">{check.label}</h3>
            <span className={`inline-flex h-6 items-center rounded-full px-2 text-[0.68rem] font-semibold ring-1 ${tone.pill}`}>
              {check.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#5a6061]">得分 {check.scoreLabel} · 耗时 {check.durationLabel}</p>
        </div>
      </div>

      <div>
        <p className="text-sm leading-7 text-[#2d3435]">{check.summary}</p>
        {check.details.length ? (
          <dl className="mt-3 grid gap-2 md:grid-cols-2">
            {check.details.map((item) => (
              <div key={`${check.name}-${item.label}`} className="rounded-lg bg-[#f9f9f9] px-3 py-2 ring-1 ring-[#adb3b4]/12">
                <dt className="text-[0.68rem] font-semibold text-[#5a6061]">{item.label}</dt>
                <dd className="mt-1 break-words text-xs leading-5 text-[#202829]">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </article>
  );
}

function PrincipleItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg bg-[#f9f9f9] p-4 ring-1 ring-[#adb3b4]/12">
      <div className="flex gap-3">
        <div className="mt-0.5 text-[#45bf78]">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-[#202829]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[#5a6061]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function getToneIcon(tone: DetectorReportTone, className: string) {
  if (tone === "success") return <CheckCircle2 className={`${className} text-[#2f7a4b]`} />;
  if (tone === "danger") return <XCircle className={`${className} text-[#9b3328]`} />;
  if (tone === "warning") return <AlertTriangle className={`${className} text-[#7a541b]`} />;
  return <Clock3 className={`${className} text-[#5a6061]`} />;
}

function getToneClass(tone: DetectorReportTone) {
  if (tone === "success") {
    return {
      pill: "bg-[#e8f3ec] text-[#2f7a4b] ring-[#45bf78]/25",
      soft: "bg-[#f4fbf7] text-[#2f7a4b] ring-[#45bf78]/20",
      iconBg: "bg-[#e8f3ec]",
    };
  }
  if (tone === "danger") {
    return {
      pill: "bg-[#fbe9e7] text-[#9b3328] ring-[#e6b8b1]",
      soft: "bg-[#fff4f2] text-[#9b3328] ring-[#e6b8b1]",
      iconBg: "bg-[#fbe9e7]",
    };
  }
  if (tone === "warning") {
    return {
      pill: "bg-[#fff7e8] text-[#7a541b] ring-[#e7b65d]/30",
      soft: "bg-[#fffaf0] text-[#7a541b] ring-[#e7b65d]/30",
      iconBg: "bg-[#fff7e8]",
    };
  }
  return {
    pill: "bg-[#f2f4f4] text-[#5a6061] ring-[#dfe4e5]",
    soft: "bg-[#f7f8f8] text-[#5a6061] ring-[#dfe4e5]",
    iconBg: "bg-[#f2f4f4]",
  };
}
