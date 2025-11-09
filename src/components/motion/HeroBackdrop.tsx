"use client";

import { motion } from "framer-motion";

export default function HeroBackdrop() {
  return (
    <div className="absolute inset-0 -z-10 bg-hero">
      {/* Soft arcs */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[.18] select-none pointer-events-none"
        viewBox="0 0 1440 720"
        aria-hidden
      >
        <defs>
          <linearGradient id="gArc" x1="0" x2="1">
            <stop offset="0" stopColor="#00E0FF" />
            <stop offset="1" stopColor="#9B5CFF" />
          </linearGradient>
        </defs>
        <path
          d="M-50,560 C280,420 1160,780 1530,420"
          fill="none"
          stroke="url(#gArc)"
          strokeWidth="2"
        />
        <path
          d="M-80,620 C220,480 1180,860 1560,480"
          fill="none"
          stroke="url(#gArc)"
          strokeWidth="2"
          opacity=".6"
        />
      </svg>

      {/* Soft bokeh blurs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute -top-24 -right-24 h-[340px] w-[340px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,224,255,.25), transparent)",
          filter: "blur(2px)",
        }}
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        className="absolute top-40 -left-20 h-[300px] w-[300px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(155,92,255,.22), transparent)",
          filter: "blur(2px)",
        }}
        aria-hidden
      />
    </div>
  );
}
