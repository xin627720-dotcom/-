// OpenAI 兼容生图适配器（覆盖 OpenAI 官方 / 国内中转 / 多数国产 OpenAI 兼容端点）

import type { ImageProvider, GenerateInput, GenerateOutput } from "./index";
import { resolveApiKey } from "./index";

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const openaiProvider: ImageProvider = {
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const { model, env } = input;
    const apiKey = resolveApiKey(env, model);
    const base = model.base_url.replace(/\/+$/, "");
    const endpoint = `${base}/v1/images/generations`;

    const body: Record<string, unknown> = {
      model: model.model_id,
      prompt: input.prompt,
      n: Math.max(1, input.n),
      size: input.size,
    };
    // DALL·E 3 支持 quality=hd/standard；gpt-image-1 用 quality=high/medium/low。
    if (input.quality) body.quality = input.quality;
    // 优先请求 base64，避免外链失效；部分端点仅返回 url，下面会兜底拉取。
    body.response_format = "b64_json";

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let json: OpenAIImageResponse;
    try {
      json = JSON.parse(text) as OpenAIImageResponse;
    } catch {
      throw new Error(`生图服务返回非 JSON（${resp.status}）：${text.slice(0, 300)}`);
    }
    if (!resp.ok) {
      throw new Error(json.error?.message || `生图失败（HTTP ${resp.status}）`);
    }
    const data = json.data ?? [];
    if (data.length === 0) throw new Error("生图服务未返回任何图片");

    const images: Uint8Array[] = [];
    for (const item of data) {
      if (item.b64_json) {
        images.push(b64ToBytes(item.b64_json));
      } else if (item.url) {
        const imgResp = await fetch(item.url);
        if (!imgResp.ok) throw new Error(`下载生成图片失败（HTTP ${imgResp.status}）`);
        images.push(new Uint8Array(await imgResp.arrayBuffer()));
      }
    }
    if (images.length === 0) throw new Error("生图服务返回的结果无法解析为图片");
    return { images };
  },
};
