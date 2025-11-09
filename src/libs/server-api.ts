// src/libs/server-api.ts
import { headers as nextHeaders } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function serverRequest<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const hdrs = nextHeaders();

  // Robustly read the Cookie header across Next versions
  let cookieHeader = "";
  // new typings: has get()
  // @ts-ignore - support both shapes
  if (typeof (hdrs as any).get === "function") {
    // @ts-ignore
    cookieHeader = (hdrs as any).get("cookie") ?? "";
  } else {
    // older readonly headers – iterate entries()
    const entries: IterableIterator<[string, string]> =
      // @ts-ignore
      (hdrs as any).entries?.() ?? [][Symbol.iterator]();
    for (const [k, v] of entries) {
      if (k.toLowerCase() === "cookie") { cookieHeader = v; break; }
    }
  }

  const h = new Headers(init.headers as HeadersInit);
  h.set("Content-Type", "application/json");
  if (cookieHeader) h.set("cookie", cookieHeader);

  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { ...init, headers: h, cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}
