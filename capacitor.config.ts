import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Remote URL mode: the Android shell loads the live staff portal from your website.
 * Updates deploy automatically when you publish to Vercel — no store update required.
 *
 * Local dev on device/emulator:
 *   STAFF_APP_SERVER_URL=http://10.0.2.2:8080/staff/login pnpm run cap:sync
 */
const staffServerUrl =
  process.env.STAFF_APP_SERVER_URL ?? "https://payroll.kanprinters.co.za/staff/login";

const config: CapacitorConfig = {
  appId: "co.za.kanprinters.payroll.staff",
  appName: "Kan Printers Staff",
  webDir: "dist",
  server: {
    url: staffServerUrl,
    cleartext: staffServerUrl.startsWith("http://"),
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0891b2",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#0891b2",
      androidSplashResourceName: "splash",
      showSpinner: true,
      spinnerColor: "#ffffff",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0891b2",
    },
  },
};

export default config;
