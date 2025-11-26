// app/api/client-error/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("🔥 CLIENT ERROR:", body);
  return NextResponse.json({ ok: true });
}
