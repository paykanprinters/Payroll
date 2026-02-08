"use client";

import React, { useEffect, useRef } from "react";

const AutoRefreshOnFocus: React.FC = () => {
  const lastTriggeredRef = useRef<number>(0);
  const lastHiddenAtRef = useRef<number | null>(null);

  const MIN_INTERVAL_MS = 30000; // throttle to avoid spamming when switching apps
  const MIN_HIDDEN_DURATION_MS = 15000; // only refresh if tab was hidden for a bit

  useEffect(() => {
    const triggerRefresh = (reason: "focus" | "visible") => {
      const now = Date.now();
      if (now - lastTriggeredRef.current < MIN_INTERVAL_MS) return;

      if (reason === "visible" && lastHiddenAtRef.current) {
        const hiddenFor = now - lastHiddenAtRef.current;
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
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
};

export default AutoRefreshOnFocus;