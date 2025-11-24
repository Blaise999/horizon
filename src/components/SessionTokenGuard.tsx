"use client";

import { useEffect } from "react";
import { clearToken } from "@/libs/api";

export function SessionTokenGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const killSession = () => {
      // 1) clear any bearer token in sessionStorage/localStorage
      clearToken();

      // 2) tell backend to clear httpOnly cookies too
      try {
        const body = new Blob([JSON.stringify({ reason: "pagehide" })], {
          type: "application/json",
        });

        // relative URL so Next rewrites/proxy still works
        navigator.sendBeacon("/api/auth/logout", body);
      } catch {}
    };

    window.addEventListener("pagehide", killSession);
    window.addEventListener("beforeunload", killSession);

    return () => {
      window.removeEventListener("pagehide", killSession);
      window.removeEventListener("beforeunload", killSession);
    };
  }, []);

  return <>{children}</>;
}
