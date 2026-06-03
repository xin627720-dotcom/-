// 生图主流程：鉴权 → 计算并预扣积分 → 调用 provider → 存 R2 → 落历史；失败退款

import type { Context } from "hono";
import type { Env, Variables } from "./types";
import { getModelById, insertGeneration, updateGeneration, newId } from "./db";
import { computeCost, deductCredits, refundCredits } from "./credits";
import { getProvider } from "./providers";

const ALLOWED_SIZES = ["256x256", "512x512", "1024x1024", "1024x1792", "1792x1024"];
const MAX_N = 4;
const MAX_PROMPT = 2000;

export async function handleGenerate(
  c: Context<{ Bindings: Env; Variables: Variables }>,
): Promise<Response> {
  const env = c.env;
  const user = c.get("user");

  const bodyUnknown = await c.req.json().catch(() => null);
  if (!bodyUnknown || typeof bodyUnknown !== "object") {
    return c.json({ error: "请求体格式错误" }, 400);
  }
  const body = bodyUnknown as Record<string, unknown>;

  const modelId = String(body.modelId ?? "");
  const prompt = String(body.prompt ?? "").trim();
  const size = ALLOWED_SIZES.includes(String(body.size)) ? String(body.size) : "1024x1024";
  const quality = String(body.quality ?? "standard");
  const n = Math.min(MAX_N, Math.max(1, parseInt(String(body.n ?? "1"), 10) || 1));

  if (!prompt) return c.json({ error: "提示词不能为空" }, 400);
  if (prompt.length > MAX_PROMPT) return c.json({ error: `提示词过长（上限 ${MAX_PROMPT} 字）` }, 400);

  const model = await getModelById(env, modelId);
  if (!model) return c.json({ error: "所选模型不存在或已停用" }, 400);

  const cost = computeCost({ creditBase: model.credit_base, prompt, size, quality, n });
  if (user.daily_credits < cost) {
    return c.json({ error: `积分不足：需要 ${cost}，当前剩余 ${user.daily_credits}` }, 402);
  }

  const genId = newId("g");
  const now = Date.now();
  await insertGeneration(env, {
    id: genId,
    user_id: user.id,
    model_id: model.id,
    model_name: model.name,
    prompt,
    size,
    quality,
    n,
    credit_cost: cost,
    status: "pending",
    image_keys_json: "[]",
    error: "",
    created_at: now,
  });

  // 图像存储（R2）未绑定时，直接返回友好提示，不扣积分
  if (!env.BUCKET) {
    await updateGeneration(env, genId, {
      status: "failed",
      error: "图像存储未启用（R2 未开通）",
    });
    return c.json({ error: "图像生成暂未启用：服务器尚未配置图片存储（R2）" }, 503);
  }

  // 预扣积分
  const deduct = await deductCredits(env, user, cost, genId);
  if (!deduct.ok) {
    await updateGeneration(env, genId, { status: "failed", error: "积分不足" });
    return c.json({ error: "积分不足" }, 402);
  }

  try {
    const provider = getProvider(model.provider_type);
    const { images } = await provider.generate({ prompt, size, quality, n, model, env });

    // 写入 R2
    const keys: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const key = `${user.id}/${genId}_${i}.png`;
      await env.BUCKET.put(key, images[i], {
        httpMetadata: { contentType: "image/png" },
      });
      keys.push(key);
    }

    await updateGeneration(env, genId, {
      status: "success",
      image_keys_json: JSON.stringify(keys),
    });

    return c.json({
      id: genId,
      images: keys.map((k) => `/img/${k}`),
      creditCost: cost,
      balance: deduct.balanceAfter,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "生图失败";
    const balance = await refundCredits(env, user.id, cost, genId);
    await updateGeneration(env, genId, { status: "failed", error: message });
    return c.json({ error: message, balance }, 502);
  }
}
