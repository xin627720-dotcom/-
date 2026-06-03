// 多模型生图网关：统一接口 + provider 注册表

import type { Env, ModelRow } from "../types";
import { openaiProvider } from "./openai";
import { fireflyProvider } from "./firefly";
import { tongyiProvider } from "./tongyi";

export interface GenerateInput {
  prompt: string;
  size: string;
  quality: string;
  n: number;
  model: ModelRow;
  env: Env;
}

// 统一输出：每张图为原始字节（PNG/JPEG）
export interface GenerateOutput {
  images: Uint8Array[];
}

export interface ImageProvider {
  generate(input: GenerateInput): Promise<GenerateOutput>;
}

const registry: Record<ModelRow["provider_type"], ImageProvider> = {
  openai: openaiProvider,
  firefly: fireflyProvider,
  tongyi: tongyiProvider,
};

export function getProvider(type: ModelRow["provider_type"]): ImageProvider {
  const p = registry[type];
  if (!p) throw new Error(`不支持的 provider 类型: ${type}`);
  return p;
}

// 从 env 按 api_key_ref 取密钥
export function resolveApiKey(env: Env, model: ModelRow): string {
  const key = (env as Record<string, unknown>)[model.api_key_ref];
  if (typeof key !== "string" || !key) {
    throw new Error(`模型「${model.name}」缺少密钥：请用 wrangler secret put ${model.api_key_ref} 配置`);
  }
  return key;
}
