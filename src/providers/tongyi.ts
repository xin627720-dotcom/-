// 阿里通义万相（DashScope）适配器（占位）
// 线上接入需 DashScope API Key；其文生图为异步任务（提交 task → 轮询结果）。
// 待用户提供 key 后实现。国内可直连，适合国内场景。

import type { ImageProvider, GenerateInput, GenerateOutput } from "./index";

export const tongyiProvider: ImageProvider = {
  async generate(_input: GenerateInput): Promise<GenerateOutput> {
    throw new Error(
      "通义万相适配器尚未配置凭证。请提供 DashScope API Key 后接入（文生图为异步任务，需轮询）。",
    );
  },
};
