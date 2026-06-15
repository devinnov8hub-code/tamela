import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/scribe-api": {
        target: "https://js24tdd3kz.eu-west-1.awsapprunner.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/scribe-api/, ""),
      },
    },
  },
});
