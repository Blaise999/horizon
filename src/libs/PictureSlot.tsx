// libs/PictureSlot.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";

type Props = {
  /** Caption text shown on the glass pill */
  label: string;
  /** Image source (public/ or remote) */
  src: string;
  /** Accessible alt text for the image */
  alt: string;
  /** CSS aspect-ratio: e.g. "16/10", "4/3", "1/1", "3/4" */
  aspect?: `${number}/${number}` | `${number}`;
  /** Optional link target */
  href?: string;
  /** Optional click handler (ignored when href is present) */
  onClick?: () => void;
  /** Prioritize image (Next/Image) */
  priority?: boolean;
  /** Extra className */
  className?: string;
};

export default function PictureSlot({
  label,
  src,
  alt,
  aspect = "16/10",
  href,
  onClick,
  priority,
  className = "",
}: Props) {
  const r = useReducedMotion();

  const content = (
    <motion.div
      className={`relative rounded-2xl overflow-hidden border border-white/10 bg-white/[.04] ${className}`}
      initial={{ opacity: 0, y: r ? 0 : 6, filter: "saturate(0.92)" }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: "saturate(1)",
        transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
      }}
      viewport={{ once: true, amount: 0.35 }}
      whileHover={r ? {} : { y: -2, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
      whileTap={r ? {} : { scale: 0.98 }}
      style={{ aspectRatio: aspect as any }}
      onClick={!href ? onClick : undefined}
      role={!href && onClick ? "button" : undefined}
      tabIndex={!href && onClick ? 0 : -1}
    >
      {/* Image */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={priority}
        className="object-cover"
      />

      {/* Subtle vignette and top sheen */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 10%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.0) 35%), linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.22) 100%)",
        }}
      />

      {/* Glass caption pill */}
      <div className="absolute left-3 bottom-3">
        <div className="rounded-xl px-3.5 py-2 text-[13px] font-medium text-white/95 relative overflow-hidden">
          {/* glass background */}
          <div className="absolute inset-0 backdrop-blur-xl bg-white/10" />
          {/* 1px gradient stroke */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 0 0 1px color(display-p3 0.60 0.90 1 / 0.10)",
            }}
          />
          {/* label text */}
          <span className="relative z-10">{label}</span>
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
