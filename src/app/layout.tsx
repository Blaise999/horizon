// app/layout.tsx
import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-svh bg-[#0E131B] text-[#E6EEF7]`}
      >
        {/* No NavBrand/AppFooter here — the page renders its own header/footer */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
