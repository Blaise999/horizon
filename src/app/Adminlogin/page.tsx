// app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn, Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import { request } from "@/libs/api"; // << use your real client

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!email || !pw) return setErr("Please enter your email and password.");

    try {
      setLoading(true);

      // 1) Call real backend (issues httpOnly cookies)
      const res = await request<{
        ok: boolean;
        user?: { id: string; email: string; role: string };
      }>("/auth/login", {
        method: "POST",
        body: { email, password: pw },
      });

      // 2) Must be admin
      if (!res?.user || res.user.role !== "admin") {
        return setErr("This account is not an admin.");
      }

      // 3) Go to Admin
      router.replace("/Admin");
    } catch (e: any) {
      setErr(e?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#0E131B] text-white grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.05] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="text-emerald-300" />
          <div className="text-lg font-semibold">Horizon — Admin Login</div>
        </div>

        <label className="grid gap-2 text-sm mb-3">
          <span className="text-white/70">Email</span>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourco.com"
              className="w-full rounded-2xl bg-white/10 border border-white/20 pl-9 pr-3 py-2.5"
            />
          </div>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-white/70">Password</span>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <input
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl bg-white/10 border border-white/20 pl-9 pr-10 py-2.5"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {err && <div className="mt-3 text-xs text-rose-300">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm transition shadow-md bg-[#00E0FF]/15 border border-[#00E0FF]/40 hover:bg-[#00E0FF]/20 text-white disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" />
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-3 text-xs text-white/60">
          Uses secure httpOnly cookies; no localStorage token.
        </p>
      </form>
    </main>
  );
}
