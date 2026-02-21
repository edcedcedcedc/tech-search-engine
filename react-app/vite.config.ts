import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    svgr({
      svgrOptions: { icon: true },
      include: "**/*.svg",
    }),

    VitePWA({
      registerType: "autoUpdate",

      devOptions: {
        enabled: true,
      },

      manifest: {
        id: "/",
        name: "Descoperire de produse prin inteligență artificială",
        short_name: "Strugure",
        description: "Găsiți rapid produse din mai multe magazine online",

        start_url: "/",
        scope: "/",

        display: "standalone",
        orientation: "portrait",

        theme_color: "#ffffff",
        background_color: "#ffffff",

        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
  
          }
        ],

        screenshots: [
          {
            src: "/screenshots/desktop.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide"
          },
          {
            src: "/screenshots/mobile.png",
            sizes: "720x1280",
            type: "image/png"
          }
        ],

        protocol_handlers: [
          {
            protocol: "web+strugure",
            url: "/?q=%s"
          }
        ]
      }
    })
  ],

  server: {
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});