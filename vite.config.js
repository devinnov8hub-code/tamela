import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/scribe-api": {
        target: "https://tamela-scribe-mvp-1088499026862.us-east1.run.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/scribe-api/, ""),
      },
    },
  },
});
