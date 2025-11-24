"use client";

import { useEffect } from "react";
import { installSessionTokenAutoClear } from "@/libs/api";

export function SessionTokenGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = installSessionTokenAutoClear();
    return cleanup; // remove listeners on unmount
  }, []);

  return <>{children}</>;
}
