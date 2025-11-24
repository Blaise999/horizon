import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = process.env.COOKIE_NAME_USER || "hb_access";

// routes that MUST be logged-in
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/cards",
  "/payments",
  "/insights",
  "/transfer",
  "/admin",
];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ignore next internals, static files, and public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (!isProtected(pathname)) return NextResponse.next();

  const access = req.cookies.get(ACCESS_COOKIE)?.value;

  if (!access) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// only run middleware on these paths (faster)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cards/:path*",
    "/payments/:path*",
    "/insights/:path*",
    "/transfer/:path*",
    "/admin/:path*",
  ],
};
