import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./globals.css";
import "./App.css";
import React from "react";

registerSW({ immediate: true });

// When a new service worker takes control after deploy, reload once so the
// document picks up fresh CSP headers (stale SW-cached HTML blocked Yoga WASM).
if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

async function initNativeStaffShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#0891b2" });
  } catch {
    // Status bar plugin optional during web dev
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    window.setTimeout(() => {
      void SplashScreen.hide();
    }, 500);
  } catch {
    // Splash plugin optional during web dev
  }
}

void initNativeStaffShell();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
