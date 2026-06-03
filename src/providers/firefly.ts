// Adobe Firefly Services 适配器（占位）
// 线上接入需 Firefly Services 的 client_id / client_secret，走 IMS 取 access_token
// 后调用 firefly v3 generate-images 接口。待用户提供凭证后实现。

import type { ImageProvider, GenerateInput, GenerateOutput } from "./index";

export const fireflyProvider: ImageProvider = {
  async generate(_input: GenerateInput): Promise<GenerateOutput> {
    throw new Error(
      "Adobe Firefly 适配器尚未配置凭证。请提供 Firefly Services 的 client_id/client_secret 后接入。",
    );
  },
};
