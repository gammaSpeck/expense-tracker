import path from "node:path";

import { defineConfig, type Plugin } from "vite";

import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

import packageJson from "./package.json";

const visualizerPlugin = visualizer({
  filename: "./dist/stats.html",
  gzipSize: true,
  brotliSize: true,
  open: false,
});

const pwaPlugin = VitePWA({
  registerType: "prompt",
  manifest: false, // Check public/site.webmanifest
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
    // Allow larger artifacts (like the analyzer `stats.html`) without failing the build
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    pwaPlugin,
    process.env.ANALYZE === "true" && (visualizerPlugin as Plugin),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts")) return "vendor_recharts";
            if (id.includes("framer-motion")) return "vendor_framer";
            if (id.includes("dexie")) return "vendor_dexie";
            if (id.includes("date-fns")) return "vendor_datefns";
            return "vendor";
          }
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_TIME__: JSON.stringify(
      new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    ),
  },
}));
