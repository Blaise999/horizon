// hooks/useMagnetic.ts
"use client";
import { useRef } from "react";
export default function useMagnetic(strength = 8) {
  const ref = useRef<HTMLButtonElement>(null);
  const onMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width/2;
    const y = e.clientY - r.top - r.height/2;
    el.style.transform = `translate(${(x/r.width)*strength}px, ${(y/r.height)*strength}px)`;
  };
  const onLeave = () => { const el = ref.current; if (el) el.style.transform = "translate(0,0)"; };
  return { ref, onMouseMove, onMouseLeave: onLeave };
}
