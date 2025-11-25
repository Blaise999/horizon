// app/dashboard/layout.tsx  (client)
"use client";
import { SessionTokenGuard } from "@/components/SessionTokenGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SessionTokenGuard>{children}</SessionTokenGuard>;
}
