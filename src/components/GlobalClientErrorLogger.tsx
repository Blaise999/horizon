// components/GlobalClientErrorLogger.tsx
"use client";

import { useEffect } from "react";

export function GlobalClientErrorLogger() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      try {
        fetch("/api/client-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: event.message,
            stack: event.error?.stack,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            userAgent: navigator.userAgent,
          }),
        });
      } catch {
        // ignore
      }
    }

    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  return null;
}
