"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { requestSafe, clearToken, installAutoLogoutOnClose } from "@/libs/api";

export function SessionTokenGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Optional: if you really want “tab close = server logout”
    // This also clears sessionStorage bearer.
    const uninstall = installAutoLogoutOnClose();

    async function checkSession() {
      const res = await requestSafe("/users/me");

      if (!mounted) return;

      if (res.ok) {
        // normalize possible shapes: {ok, user} OR direct user
        const user = (res.data as any)?.user ?? res.data;
        if (user) {
          setAllowed(true);
          return;
        }
      }

      // Not authorized → kill any stale bearer & redirect
      clearToken();
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?next=${next}`);
    }

    checkSession();

    return () => {
      mounted = false;
      uninstall?.();
    };
  }, [router, pathname]);

  if (!allowed) {
    // tiny loader so you don’t flash protected UI
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
