"use client";

import React, { useEffect, useRef } from "react";

const MIN_INTERVAL_MS = 30000; // throttle to avoid spamming when switching apps
const MIN_HIDDEN_DURATION_MS = 15000; // only refresh if tab was hidden for a bit
// If the tab was hidden for a long time (sleep/lock), a clean reload is often the most reliable recovery.
const FORCE_RELOAD_HIDDEN_MS = 3 * 60 * 1000; // 3 minutes
const FORCE_RELOAD_COOLDOWN_MS = 10 * 60 * 1000; // don't reload repeatedly

const AutoRefreshOnFocus: React.FC = () => {
  const lastTriggeredRef = useRef<number>(0);
  const lastHiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const onOnline = () => {
      // When coming back from sleep, network may reconnect after focus/visible.
      window.dispatchEvent(new Event("appFocusRefresh"));
    };

    const triggerRefresh = (reason: "focus" | "visible") => {
      const now = Date.now();

      // If we just opened a PDF in a new tab, suppress focus-refresh to avoid
      // a burst of parallel Supabase refetches when users return.
      try {
        const until = Number(sessionStorage.getItem("suppressAppFocusRefreshUntil") || "0");
        if (until && now < until) return;
      } catch {
        // ignore
      }

      if (now - lastTriggeredRef.current < MIN_INTERVAL_MS) return;

      if (reason === "visible" && lastHiddenAtRef.current) {
        const hiddenFor = now - lastHiddenAtRef.current;

        // Sleep/lock can leave pending requests in a bad state; prefer a hard reload after long inactivity.
        if (hiddenFor >= FORCE_RELOAD_HIDDEN_MS) {
          const path = window.location.pathname;
          const onAuthPages =
            path === "/login" ||
            path === "/employee" ||
            path === "/staff/login" ||
            path === "/staff/install";

          if (!onAuthPages) {
            const lastReload = Number(sessionStorage.getItem("resumeReloadTs") || "0");
            if (now - lastReload > FORCE_RELOAD_COOLDOWN_MS) {
              sessionStorage.setItem("resumeReloadTs", String(now));
              window.location.reload();
              return;
            }
          }
        }

        if (hiddenFor < MIN_HIDDEN_DURATION_MS) return;
      }

      lastTriggeredRef.current = now;

      // Broadcast a global refresh event (no toast to avoid spam)
      window.dispatchEvent(new Event("appFocusRefresh"));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastHiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState === "visible") {
        triggerRefresh("visible");
      }
    };

    const onFocus = () => {
      // When switching between apps, focus often accompanies visibility change.
      // Keep a small guard so we don't double-trigger.
      triggerRefresh("focus");
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
};

export default AutoRefreshOnFocus;