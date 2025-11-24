"use client";

import { useEffect } from "react";
import { installAutoLogoutOnClose } from "@/libs/api";

export function SessionTokenGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = installAutoLogoutOnClose();
    return cleanup;
  }, []);

  return <>{children}</>;
}
