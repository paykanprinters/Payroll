import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { reportPdfApiPlugin } from "./vite/plugins/report-pdf-api";

const STAFF_PWA_ICONS = [
  {
    src: "/brand/kanprinters_icon_color.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/brand/kanprinters_icon_color.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/brand/kanprinters_icon_color.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
] as const;

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    reportPdfApiPlugin(),
    dyadComponentTagger(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "brand/kanprinters_icon_color.png",
        "brand/kanprinters_stacked_color.png",
        "robots.txt",
      ],
      manifest: {
        id: "co.za.kanprinters.payroll.staff",
        name: "Kan Printers Staff",
        short_name: "Staff",
        description:
          "Employee self-service — payslips, leave balances, loans, and savings for Kan Printers staff.",
        theme_color: "#0891b2",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/staff/",
        start_url: "/staff/login",
        categories: ["business", "finance", "productivity"],
        icons: [...STAFF_PWA_ICONS],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Export/import tooling is large and interaction-only. Cache these
        // chunks after first use instead of downloading them at install time.
        globIgnores: [
          "**/react-pdf.browser-*.js",
          "**/jszip.min-*.js",
          "**/papaparse.min-*.js",
          "**/*PdfDocument-*.js",
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern:
              /\/assets\/(?:react-pdf\.browser|jszip\.min|papaparse\.min|[^/]*PdfDocument)-[^/]+\.js$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "on-demand-document-tools",
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        navigateFallback: "/index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
