// src/components/AppFooter.tsx
import Link from "next/link";
import {
  CheckCircle2,
  Globe,
  ChevronDown,
  Twitter,
  Github,
  Linkedin,
  Youtube,
} from "lucide-react";
import { PATHS } from "@/config/routes";

type FooterColProps = {
  title: string;
  links: { label: string; href: string }[];
};

function FooterCol({ title, links }: FooterColProps) {
  return (
    <div>
      <div className="text-[13px] font-medium tracking-wide text-white/90 mb-2">
        {title}
      </div>
      <ul className="space-y-2 text-[14px] text-[var(--c-text-2)]">
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AppFooter() {
  const year = new Date().getFullYear();

  // ✅ single source of truth for all support/help routes
  const SUPPORT_PATH = "/support";

  return (
    <footer className="border-t border-white/5 bg-[#0E131B]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-10 md:gap-12 lg:grid-cols-12">
          {/* Brand / downloads / socials */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-b from-cyan-500 to-emerald-500" />
              <span className="font-semibold text-[18px] text-white">
                Horizon
              </span>
            </div>

            <p className="mt-3 text-[var(--c-text-2)]">
              Modern money, beautifully simple.
            </p>

            {/* app badges (placeholders) */}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="#"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Download on App Store
              </Link>
              <Link
                href="#"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Get it on Google Play
              </Link>
            </div>

            {/* socials */}
            <div className="mt-6 flex items-center gap-3 text-white/70">
              <a
                href="https://twitter.com"
                aria-label="Twitter"
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <Twitter size={18} />
              </a>
              <a
                href="https://github.com"
                aria-label="GitHub"
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <Github size={18} />
              </a>
              <a
                href="https://www.linkedin.com"
                aria-label="LinkedIn"
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="https://youtube.com"
                aria-label="YouTube"
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <Youtube size={18} />
              </a>
            </div>

            {/* trust line */}
            <div className="mt-6 flex items-center gap-2 text-xs text-[var(--c-text-2)]">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              FDIC-insured partners • 256-bit TLS
            </div>
          </div>

          {/* Link columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
            <FooterCol
              title="Product"
              links={[
                { label: "Accounts", href: PATHS.CREATE_ACCOUNT },
                { label: "Cards & Controls", href: PATHS.CARDS },
                { label: "Savings & Goals", href: PATHS.PRICING }, // adjust to your actual route
                { label: "Invest", href: PATHS.ABOUT }, // adjust to your actual route
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                { label: "About", href: PATHS.ABOUT },
                { label: "Careers", href: `${PATHS.ABOUT}#careers` },
                { label: "Press", href: `${PATHS.ABOUT}#press` },
                { label: "Security", href: PATHS.SECURITY },
              ]}
            />
            <FooterCol
              title="Legal"
              links={[
                { label: "Privacy", href: "#privacy" },
                { label: "Terms", href: "#terms" },
                { label: "Licenses", href: "#licenses" },
                { label: "Disclosures", href: "#disclosures" },
              ]}
            />

            {/* ✅ everything support/help/status/dev now points to /support */}
            <FooterCol
              title="Support"
              links={[
                { label: "Help Center", href: SUPPORT_PATH },
                { label: "Status", href: `${SUPPORT_PATH}#status` },
                { label: "Contact", href: `${SUPPORT_PATH}#contact` },
                { label: "Developers", href: `${SUPPORT_PATH}#developers` },
              ]}
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 md:mt-14 flex flex-col gap-4 border-t border-[var(--c-hairline)]/80 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10">
              <Globe size={16} className="opacity-80" />
              English (US)
              <ChevronDown size={14} className="opacity-70" />
            </button>
            <button className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10">
              USD
              <ChevronDown size={14} className="opacity-70" />
            </button>

            {/* ✅ status also routes to /support */}
            <Link
              href={`${SUPPORT_PATH}#status`}
              className="ml-1 text-[var(--c-text-2)] text-sm hover:text-white"
            >
              Status: <span className="text-emerald-400">All systems normal</span>
            </Link>
          </div>

          <div className="text-sm text-[var(--c-text-2)]">
            © {year} Horizon Bank Inc. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
