// components/FigureCallout.tsx
"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  src: string;          // e.g. "/img/woman-point-left.png"
  alt?: string;         // short, helpful alt
  width?: number;       // intrinsic img width
  height?: number;      // intrinsic img height
  className?: string;   // extra Tailwind
};

export default function FigureCallout({
  src,
  alt = "Smiling woman pointing at features",
  width = 520,
  height = 680,
  className = "",
}: Props) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, rotate: -1 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
      className={`relative select-none ${className}`}
      aria-hidden={false}
    >
      {/* soft glow behind */}
      <span
        aria-hidden
        className="absolute -inset-6 rounded-3xl blur-2xl opacity-40"
        style={{
          background:
            "radial-gradient(240px 200px at 70% 20%, rgba(0,224,255,.20), rgba(0,224,255,0))",
        }}
      />
      <motion.div
        animate={
          reduced
            ? undefined
            : { y: [0, -6, 0], rotate: [0, -1.2, 0] }
        }
        transition={
          reduced
            ? undefined
            : { duration: 6, repeat: Infinity, ease: "easeInOut" }
        }
        className="relative"
      >
        <Image
          src={src}
          alt={alt}
          priority
          width={width}
          height={height}
          className="w-[68vw] max-w-[320px] md:max-w-none md:w-[360px] lg:w-[420px] h-auto object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,.45)]"
        />
        {/* pointer accent arrow (subtle, optional) */}
        <motion.span
          aria-hidden
          className="hidden md:block absolute top-[20%] right-[88%] h-[2px] w-16"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,224,255,0), rgba(0,224,255,.9), rgba(0,224,255,0))",
          }}
          animate={reduced ? undefined : { x: [0, -6, 0] }}
          transition={reduced ? undefined : { duration: 2.2, repeat: Infinity }}
        />
      </motion.div>
    </motion.div>
  );
}
