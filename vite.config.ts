import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 前端源码在 web/，构建产物输出到 web/dist（由 Worker 的 assets 绑定托管）
export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    // 本地 vite dev 时把 /api、/img 代理到 wrangler dev
    proxy: {
      "/api": "http://localhost:8787",
      "/img": "http://localhost:8787",
    },
  },
});
