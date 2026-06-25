"use client";

import { useEffect } from "react";
import { recordSystemError } from "@/lib/audit-trail";

/** Captures uncaught client errors into the audit trail. */
export default function GlobalErrorLogger() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void recordSystemError(event.message || "Uncaught error", {
        source: "window.error",
        filename: event.filename,
        lineno: event.lineno,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : "Unhandled promise rejection";
      void recordSystemError(message, { source: "unhandledrejection" });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
