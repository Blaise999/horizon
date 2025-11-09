// app/layout.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Horizon Bank",
  description:
    "Premium fintech experience — smooth motion, secure accounts, daily interest savings, and instant cards.",
};

// ✅ prevent SSG/ISR so pages using useSearchParams/usePathname don't break builds
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-svh bg-[#0E131B] text-[#E6EEF7]`}
      >
        {/* No NavBrand/AppFooter here — the page renders its own header/footer */}
        <Providers>
          {/* ✅ satisfies Next’s Suspense requirement for client hooks at build time */}
          <Suspense fallback={null}>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
