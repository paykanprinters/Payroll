"use client";

import React, { useEffect } from "react";

const TimesheetDebugLogger: React.FC = () => {
  useEffect(() => {
    const log = (type: string, detail?: any) => {
      const ts = new Date().toISOString();
      // Use console.warn for higher visibility
      if (detail !== undefined) {
        console.warn(`[TimesheetDebug] ${ts} ${type}`, detail);
      } else {
        console.warn(`[TimesheetDebug] ${ts} ${type}`);
      }
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      log("beforeunload fired");
      // Don’t block unload; just log
    };
    const onVisibility = () => {
      log(`visibilitychange: ${document.visibilityState}`);
    };
    const onFocus = () => log("window focus");
    const onBlur = () => log("window blur");
    const onPopState = (e: PopStateEvent) => log("popstate", { state: e.state });
    const onHashChange = () => log("hashchange", { hash: location.hash });
    const onPageHide = (e: PageTransitionEvent) => log("pagehide", { persisted: e.persisted });
    const onPageShow = (e: PageTransitionEvent) => log("pageshow", { persisted: e.persisted });
    const onKeyDown = (e: KeyboardEvent) => {
      // Log key presses to detect accidental submits
      log("keydown", { key: e.key, ctrl: e.ctrlKey, shift: e.shiftKey, meta: e.metaKey });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("keydown", onKeyDown);

    log("TimesheetDebugLogger mounted");

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("keydown", onKeyDown);
      log("TimesheetDebugLogger unmounted");
    };
  }, []);

  return null;
};

export default TimesheetDebugLogger;