// app/blog/page.tsx
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import NavBrand from "@/components/Navbrand";
import AppFooter from "@/components/Appfooter";
import {
  ArrowRight,
  Newspaper,
  Tag,
  Search,
  Share2,
  CalendarDays,
  User2,
  Sparkles,
  Quote,
  Megaphone,
  Download,
} from "lucide-react";

/**
 * Horizon Blog & Press — image-free, cinematic, filterable.
 * Professional banking tone; uses gradient panels instead of photos.
 */

type Post = {
  id: string;
  title: string;
  desc: string;
  date: string; // ISO or pretty
  author: string;
  tag: "Product" | "Security" | "Engineering" | "Growth" | "Company";
  minutes: number;
  featured?: boolean;
};

const POSTS: Post[] = [
  {
    id: "ai-finance",
    title: "Horizon Insight Engine: How Our AI Turns Spending into Strategy",
    desc: "From raw transactions to smart nudges—the ML stack and guardrails behind our personalized finance.",
    date: "2025-06-21",
    author: "R. Adeyemi",
    tag: "Product",
    minutes: 8,
    featured: true,
  },
  {
    id: "card-security-2025",
    title: "Card Security 2025: Tokenization, MCC Locks, and Real-time Anomaly Defense",
    desc: "A deep dive into our layered protections and why privacy-by-default matters.",
    date: "2025-05-12",
    author: "T. Lawson",
    tag: "Security",
    minutes: 7,
  },
  {
    id: "global-expansion",
    title: "Scaling Beyond Borders: Our Multi-Currency Core and FX Routing",
    desc: "How we designed a cross-border engine that feels instant and honest on fees.",
    date: "2025-04-30",
    author: "M. Idris",
    tag: "Company",
    minutes: 6,
  },
  {
    id: "motion-systems",
    title: "Motion Systems at Horizon: Designing Calm, Useful Delight",
    desc: "The principles behind our micro-interactions and what we choose not to animate.",
    date: "2025-03-15",
    author: "A. Chika",
    tag: "Engineering",
    minutes: 9,
  },
  {
    id: "growth-numbers",
    title: "From Zero to Millions: How We Run 500+ Experiments a Year",
    desc: "A growth playbook rooted in taste, data, and respect for the user’s time.",
    date: "2025-02-10",
    author: "S. Okonkwo",
    tag: "Growth",
    minutes: 10,
  },
  {
    id: "status-uptime",
    title: "99.98% Uptime: Architecture, Observability, and Graceful Degradation",
    desc: "An honest look at SLAs, SLOs, and the patterns that saved us on bad days.",
    date: "2025-01-05",
    author: "K. Bello",
    tag: "Engineering",
    minutes: 11,
  },
  {
    id: "design-language",
    title: "Design Language 2.0: Grid, Type, and the New Quartz Glow",
    desc: "Inside our refreshed system: rhythm, density, and accessible color in dark mode.",
    date: "2024-12-18",
    author: "N. Eze",
    tag: "Product",
    minutes: 6,
  },
  {
    id: "compliance-journey",
    title: "Our Compliance Journey: Building Trust at Global Scale",
    desc: "SOC 2, PCI-DSS, GDPR—what they mean in practice and why we over-invest.",
    date: "2024-11-02",
    author: "R. Onuoha",
    tag: "Company",
    minutes: 7,
  },
];

const TAGS: Array<Post["tag"] | "All"> = [
  "All",
  "Product",
  "Security",
  "Engineering",
  "Growth",
  "Company",
];

// util
const fmt = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function BlogPressPage() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<Post["tag"] | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POSTS.filter(
      (p) =>
        (tag === "All" || p.tag === tag) &&
        (!q ||
          p.title.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q))
    );
  }, [query, tag]);

  const feature = filtered.find((p) => p.featured) ?? filtered[0];
  const rest = filtered.filter((p) => p.id !== feature?.id);

  return (
    <main className="min-h-svh bg-[#0E131B] text-[#E6EEF7]">
      <NavBrand />

      {/* HERO — Featured story (image-free gradient panel) */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 text-xs text-[#9BB0C6]"
          >
            <Newspaper className="w-4 h-4" />
            Horizon Blog & Press
          </motion.div>

          <div className="mt-4 grid lg:grid-cols-[1.25fr_.75fr] gap-8 items-stretch">
            {/* Feature card */}
            {feature && (
              <motion.article
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-3xl overflow-hidden ring-1 ring-white/10 bg-[#101826]/70 backdrop-blur-xl"
              >
                <div
                  aria-hidden
                  className="h-28 md:h-36 w-full bg-[radial-gradient(600px_200px_at_10%_20%,rgba(0,224,255,0.25),transparent),radial-gradient(600px_200px_at_90%_80%,rgba(155,92,255,0.22),transparent)]"
                />
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-3 text-xs text-[#9BB0C6]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5">
                      <Tag className="w-3 h-3" /> {feature.tag}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> {fmt(feature.date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User2 className="w-3 h-3" /> {feature.author}
                    </span>
                    <span>{feature.minutes} min</span>
                  </div>
                  <h1 className="mt-3 text-2xl md:text-4xl font-semibold leading-tight">
                    {feature.title}
                  </h1>
                  <p className="mt-2 text-[#9BB0C6]">{feature.desc}</p>
                  <div className="mt-5 flex items-center gap-3">
                    <a className="rounded-xl bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] text-[#0E131B] px-4 py-2 text-sm font-medium inline-flex items-center gap-2 hover:scale-[1.02] transition">
                      Read story <ArrowRight className="w-4 h-4" />
                    </a>
                    <button className="rounded-xl bg-white/10 px-3 py-2 text-xs inline-flex items-center gap-2 hover:bg-white/15">
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                  </div>
                </div>
              </motion.article>
            )}

            {/* Right rail — Search + Categories + Press */}
            <aside className="space-y-6">
              <div className="rounded-2xl p-5 bg-[#101826]/80 ring-1 ring-white/10 backdrop-blur-xl">
                <label className="text-xs text-[#9BB0C6]">Search</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                  <Search className="w-4 h-4 text-white/70" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find posts, authors…"
                    className="bg-transparent outline-none text-sm w-full placeholder:text-[#9BB0C6]"
                  />
                </div>
              </div>

              <div className="rounded-2xl p-5 bg-[#101826]/80 ring-1 ring-white/10 backdrop-blur-xl">
                <div className="text-xs text-[#9BB0C6]">Categories</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTag(t)}
                      className={`px-3 py-1 rounded-lg text-xs ring-1 ring-white/10 ${
                        tag === t ? "bg-white/15" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Press kit callout */}
              <div className="rounded-2xl p-5 bg-gradient-to-br from-white/[0.06] to-transparent ring-1 ring-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="opacity-80" />
                  <div className="font-medium">Press & Media</div>
                </div>
                <p className="text-sm text-[#9BB0C6]">
                  Looking for logos, color specs, or brand guidelines?
                </p>
                <a className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs">
                  <Download className="w-3.5 h-3.5" /> Download press kit
                </a>
              </div>

              {/* Quote */}
              <div className="rounded-2xl p-5 bg-[#0F1622] ring-1 ring-white/10">
                <Quote className="opacity-70" />
                <p className="mt-2 text-sm text-[#9BB0C6]">
                  “We treat clarity as a feature. Every release should reduce cognitive load and increase confidence.”
                </p>
                <div className="mt-3 text-xs text-white/80">— Horizon Design Team</div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* MAGAZINE GRID (image-free cards) */}
      <section className="mx-auto max-w-7xl px-6 pt-10 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {rest.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-3xl overflow-hidden ring-1 ring-white/10 bg-[#101826]/60 backdrop-blur-xl"
            >
              {/* Decorative header bar */}
              <div
                aria-hidden
                className="h-16 w-full bg-[radial-gradient(500px_140px_at_15%_30%,rgba(0,224,255,0.25),transparent),radial-gradient(500px_140px_at_85%_70%,rgba(155,92,255,0.22),transparent)]"
              />
              <div className="p-5">
                <div className="flex items-center gap-3 text-[11px] text-[#9BB0C6]">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> {fmt(p.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User2 className="w-3 h-3" /> {p.author}
                  </span>
                  <span>{p.minutes} min</span>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-white/5 ring-1 ring-white/10">
                    {p.tag}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-medium">{p.title}</h3>
                <p className="mt-1 text-sm text-[#9BB0C6] line-clamp-3">{p.desc}</p>
                <button className="mt-4 inline-flex items-center gap-2 text-sm text-[#00E0FF]">
                  Read more <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* NEWSLETTER / CTA STRIP */}
      <section className="relative py-20 bg-gradient-to-b from-[#101826] to-[#0E131B] overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(1000px_400px_at_20%_20%,rgba(0,224,255,0.3),transparent)]" />
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-xs text-[#9BB0C6]">
            <Sparkles className="w-4 h-4" /> Stay in the loop
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold">Get product updates and stories</h2>
          <p className="mt-2 text-[#9BB0C6]">
            We send occasional emails about new features, security notes, and behind-the-scenes craft.
          </p>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-6 mx-auto max-w-xl flex items-center gap-2 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10"
          >
            <input
              type="email"
              placeholder="you@company.com"
              className="flex-1 bg-transparent px-3 py-2 outline-none text-sm placeholder:text-[#9BB0C6]"
              required
            />
            <button className="rounded-xl bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] text-[#0E131B] px-4 py-2 text-sm font-medium">
              Subscribe
            </button>
          </form>

          <p className="mt-2 text-xs text-[#9BB0C6]">No spam. Unsubscribe any time.</p>
        </div>
      </section>

      {/* PRESS HIGHLIGHTS (image-free tiles) */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-2xl md:text-4xl font-semibold text-center">Press highlights</h2>
        <p className="text-center text-[#9BB0C6] max-w-2xl mx-auto mt-2">
          A few recent features from publications covering our journey.
        </p>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            ["TechCrunch", "Horizon raises Series B to scale cross-border accounts"],
            ["Wired", "Inside the motion language redesign of a modern bank"],
            ["Financial Times", "How new banks are rebuilding trust with radical transparency"],
          ].map(([outlet, head], i) => (
            <motion.a
              key={outlet}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-3xl ring-1 ring-white/10 bg-[#101826]/70 backdrop-blur-xl cursor-pointer overflow-hidden"
            >
              <div
                aria-hidden
                className="h-20 w-full bg-[radial-gradient(500px_140px_at_20%_30%,rgba(0,224,255,0.25),transparent),radial-gradient(500px_140px_at_80%_70%,rgba(155,92,255,0.22),transparent)] transition-all duration-500 group-hover:opacity-90"
              />
              <div className="p-5">
                <div className="text-xs text-[#9BB0C6]">{outlet}</div>
                <div className="font-medium mt-1">{head}</div>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-[#00E0FF]">
                  Read article <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
