import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Horizon — A clearer view of your finances",
  description: "Meet Horizon: a beautifully organized financial workspace for account overviews, activity insights, and transfer request tracking.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body className="antialiased min-h-screen"><Providers><Suspense fallback={null}>{children}</Suspense></Providers></body></html>;
}
