"use client";

import React, { useEffect, useRef } from "react";
import { showSuccess } from "@/utils/toast";

const AutoRefreshOnFocus: React.FC = () => {
  const lastTriggeredRef = useRef<number>(0);
  const MIN_INTERVAL_MS = 10000; // 10s throttle to avoid spamming when switching apps rapidly

  useEffect(() => {
    const triggerRefresh = () => {
      const now = Date.now();
      if (now - lastTriggeredRef.current < MIN_INTERVAL_MS) return;
      lastTriggeredRef.current = now;

      // Notify user and broadcast a global refresh event
      showSuccess("Refreshing data…");
      window.dispatchEvent(new Event("appFocusRefresh"));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    };

    window.addEventListener("focus", triggerRefresh);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", triggerRefresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
};

export default AutoRefreshOnFocus;