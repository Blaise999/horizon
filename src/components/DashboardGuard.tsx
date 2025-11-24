"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import API from "@/libs/api";

export default function DashboardGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // ✅ server-truth check (cookies included in API wrapper)
        const user = await API.meUser();

        if (!alive) return;

        // if meUser returns nothing meaningful, treat as logged out
        if (!user?.id && !user?._id && !user?.email) {
          throw new Error("No session");
        }

        setReady(true);
      } catch {
        // 🔒 best-effort logout to clear cookies on server
        try {
          if (typeof API.logout === "function") {
            await API.logout();
          } else {
            await fetch("/api/auth/logout", {
              method: "POST",
              credentials: "include",
              cache: "no-store",
            });
          }
        } catch {}

        if (!alive) return;

        const next = encodeURIComponent(pathname || "/dashboard");
        router.replace(`/login?next=${next}`);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="min-h-svh grid place-items-center text-[#9BB0C6]">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
