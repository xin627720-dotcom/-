import { useEffect, useState, useCallback } from "react";
import { api, type Model, type HistoryItem } from "../api";

const SIZES = ["1024x1024", "1024x1792", "1792x1024", "512x512", "256x256"];
const QUALITIES = [
  { value: "standard", label: "标准" },
  { value: "hd", label: "高清" },
];

export default function Studio({ onCredits }: { onCredits: (c: number) => void }) {
  const [models, setModels] = useState<Model[]>([]);
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("standard");
  const [n, setN] = useState(1);

  const [estimate, setEstimate] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    api.models().then((r) => {
      setModels(r.models);
      if (r.models[0]) setModelId(r.models[0].id);
    });
    api.history().then((r) => setHistory(r.items)).catch(() => {});
  }, []);

  // 实时预估积分（防抖）
  useEffect(() => {
    if (!modelId || !prompt.trim()) {
      setEstimate(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .estimate({ modelId, prompt, size, quality, n })
        .then((r) => setEstimate(r.cost))
        .catch(() => setEstimate(null));
    }, 350);
    return () => clearTimeout(t);
  }, [modelId, prompt, size, quality, n]);

  const generate = useCallback(async () => {
    if (!modelId || !prompt.trim() || generating) return;
    setGenerating(true);
    setError("");
    setResults([]);
    try {
      const r = await api.generate({ modelId, prompt, size, quality, n });
      setResults(r.images);
      onCredits(r.balance);
      const h = await api.history();
      setHistory(h.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
      // 失败可能已退款，刷新余额
      api.me().then((m) => m.user && onCredits(m.user.credits)).catch(() => {});
    } finally {
      setGenerating(false);
    }
  }, [modelId, prompt, size, quality, n, generating, onCredits]);

  const currentModel = models.find((m) => m.id === modelId);

  return (
    <div className="grid lg:grid-cols-[360px_1fr]">
        {/* 控制区 */}
        <section className="p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-neutral-800 space-y-5">
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">模型</label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm outline-none focus:border-indigo-500"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}（基础 {m.creditBase} 积分/张）
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">提示词</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="描述你想生成的画面，越详细越好…"
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm outline-none focus:border-indigo-500 resize-none"
            />
            <div className="text-right text-[11px] text-neutral-600 mt-1">{prompt.length}/2000</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">尺寸</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm outline-none focus:border-indigo-500"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">质量</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm outline-none focus:border-indigo-500"
              >
                {QUALITIES.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">数量：{n}</label>
            <input
              type="range"
              min={1}
              max={4}
              value={n}
              onChange={(e) => setN(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between text-sm bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5">
            <span className="text-neutral-400">预计消耗</span>
            <span className="font-semibold text-indigo-400">
              {estimate === null ? "—" : `${estimate} 积分`}
            </span>
          </div>

          {error && <div className="text-sm text-rose-400 bg-rose-950/40 rounded-lg px-3 py-2">{error}</div>}

          <button
            onClick={generate}
            disabled={generating || !prompt.trim() || !modelId}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                生成中…
              </>
            ) : (
              "生成图像"
            )}
          </button>
          {currentModel && (
            <p className="text-[11px] text-neutral-600 text-center">
              引擎类型：{currentModel.providerType}
            </p>
          )}
        </section>

        {/* 结果 + 历史 */}
        <section className="p-4 sm:p-6 space-y-8">
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">生成结果</h2>
            {results.length === 0 ? (
              <div className="h-48 rounded-xl border border-dashed border-neutral-800 flex items-center justify-center text-neutral-600 text-sm">
                {generating ? "正在生成，请稍候…" : "生成的图片会显示在这里"}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {results.map((url) => (
                  <ImageCard key={url} url={url} onOpen={() => setLightbox(url)} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">生成历史</h2>
            {history.length === 0 ? (
              <p className="text-sm text-neutral-600">暂无历史记录</p>
            ) : (
              <div className="space-y-4">
                {history.map((h) => (
                  <div key={h.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-2">
                      <span>
                        {h.modelName} · {h.size} · {h.creditCost} 积分
                        {h.status === "failed" && <span className="text-rose-400"> · 失败</span>}
                      </span>
                      <span>{new Date(h.createdAt).toLocaleString("zh-CN")}</span>
                    </div>
                    <p className="text-sm text-neutral-300 mb-2 line-clamp-2">{h.prompt}</p>
                    {h.status === "failed" ? (
                      <p className="text-xs text-rose-400">{h.error}</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {h.images.map((url) => (
                          <ImageCard key={url} url={url} onOpen={() => setLightbox(url)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="预览" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

function ImageCard({ url, onOpen }: { url: string; onOpen: () => void }) {
  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800">
      <img
        src={url}
        alt="生成图片"
        loading="lazy"
        onClick={onOpen}
        className="w-full h-full object-cover cursor-zoom-in"
      />
      <a
        href={url}
        download
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition bg-black/60 hover:bg-black/80 text-white text-[11px] px-2 py-1 rounded"
      >
        下载
      </a>
    </div>
  );
}
