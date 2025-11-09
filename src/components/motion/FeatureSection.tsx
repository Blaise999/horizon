"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface FeatureSectionProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  center?: boolean;
  id?: string;
  children?: ReactNode;
  /** extra classes for the children wrapper (e.g. "overflow-visible") */
  childrenClassName?: string;
  /** optional right-aligned actions (e.g., CTA buttons) */
  actions?: ReactNode;
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] },
  },
};

export default function FeatureSectionPro({
  title,
  subtitle,
  eyebrow,
  center = false,
  id,
  children,
  childrenClassName = "",
  actions,
}: FeatureSectionProps) {
  const ariaProps = id ? { "aria-labelledby": `${id}-title` } : {};

  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionVariants}
      // ↓ Replace section-pad with explicit, tighter mobile padding
      className={`container-x sm:py-20 lg:py-24 py-10 ${center ? "text-center" : ""} overflow-visible relative`}
      {...ariaProps}
    >
      {/* ambient hairline + glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      </div>

      <div className={`${center ? "mx-auto max-w-3xl" : ""} overflow-visible`}>
        {eyebrow && (
          <p className="text-[12px] uppercase tracking-[0.18em] text-white/60 mb-1">
            {eyebrow}
          </p>
        )}

        <div className={`flex ${center ? "justify-center" : "justify-between"} items-start gap-4`}>
          <motion.h2
            id={id ? `${id}-title` : undefined}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="text-[28px] md:text-[36px] font-semibold leading-[1.08]"
          >
            {title}
          </motion.h2>

          {actions && <div className="shrink-0">{actions}</div>}
        </div>

        {subtitle && (
          <p className="text-[var(--c-text-2)] mt-2 max-w-[60ch] mx-auto">
            {subtitle}
          </p>
        )}

        <div
          className={`mt-3 sm:mt-4 ${center ? "mx-auto" : ""} h-px w-24 rounded-full`}
          style={{
            background:
              "linear-gradient(90deg, rgba(0,212,255,0), rgba(0,212,255,.6), rgba(0,224,255,0))",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
        // ↓ tighter top space on phones
        className={`mt-6 sm:mt-8 overflow-visible ${childrenClassName}`}
      >
        {children}
      </motion.div>
    </motion.section>
  );
}
