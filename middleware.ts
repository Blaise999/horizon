// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Any route under these prefixes requires auth
const PROTECTED_PREFIXES = ["/dashboard", "/accounts", "/Transfer", "/insights", "/cards"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isProtected) return NextResponse.next();

  // ✅ Your backend sets session-only cookies:
  // env.COOKIE_NAME_USER || "hb_access"
  const access = req.cookies.get("hb_access")?.value;

  if (!access) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/Transfer/:path*",
    "/insights/:path*",
    "/cards/:path*",
  ],
};
