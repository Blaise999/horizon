// ZigZagRow.tsx
"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function ZigCard({ children, i }: { children: ReactNode; i: number }) {
  const odd = i % 2 === 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: .5, ease: "easeOut" }}
      className={`relative rounded-2xl bg-white/[.06] backdrop-blur-xl ring-1 ring-white/10
                  shadow-[0_10px_30px_rgba(0,0,0,.35)] p-5 mx-3
                  ${odd ? "translate-x-3" : "-translate-x-3"}`}
    >
      {/* top hairline */}
      <div className="absolute inset-x-0 top-0 h-[2px] opacity-70"
           style={{background:"linear-gradient(90deg,rgba(0,224,255,.8),rgba(155,92,255,.5))"}} />
      {children}
    </motion.div>
  );
}

export default function ZigZagRow({ items }: { items: ReactNode[] }) {
  return (
    <div className="md:hidden grid gap-4">
      {items.map((el, i) => <ZigCard key={i} i={i}>{el}</ZigCard>)}
    </div>
  );
}
