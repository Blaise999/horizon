// src/lib/motion.ts
import { cubicBezier } from "framer-motion";

export const dur = {
  ui: 0.18,           // 160–220ms (picked 180ms)
  surface: 0.30,      // 260–340ms (picked 300ms)
  count: 1.0,         // 800–1200ms (picked ~1s)
  ripple: 0.22,
};

export const ease = {
  outQuint: cubicBezier(0.23, 1, 0.32, 1),
  inQuint: cubicBezier(0.64, 0, 0.78, 0),
};

export const travel = { sm: 4, md: 8, lg: 12 }; // px

export const elev = {
  0: "shadow-none",
  1: "shadow-[0_8px_24px_rgba(0,0,0,.25)]",
  2: "shadow-[0_14px_40px_rgba(0,0,0,.35)]",
};
