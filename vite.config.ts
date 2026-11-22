import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "clean-css-diagnostics",
      enforce: "post",
      generateBundle(_, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type === "asset" && typeof file.source === "string" && file.fileName.endsWith(".css")) {
            file.source = file.source.replace(/vertical-align:\s*middle;\s*display:\s*block/g, "display:block");
          }
        }
      },
    },
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        importScripts: ["sw-notifications.js"],
      },
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "favicon-96x96.png",
        "favicon-32x32.png",
        "favicon-16x16.png",
        "apple-touch-icon.png",
        "mask-icon.svg",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "pwa-maskable-512x512.png",
        "icons8-google-wallet-material-rounded-70.png",
        "icons8-google-wallet-material-rounded-96.png",
      ],
      manifest: {
        name: "FinTrack - Personal Expense Tracker",
        short_name: "FinTrack",
        description:
          "Local-first personal finance tracker with complex PG split & asynchronous settlement engine",
        theme_color: "#0e0f12",
        background_color: "#0e0f12",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "icons8-google-wallet-material-rounded-96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ],
  preview: {
    allowedHosts: true,
  },
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
});
