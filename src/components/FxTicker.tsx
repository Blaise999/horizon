// components/FxTicker.tsx
"use client";
import { useEffect, useState } from "react";

export default function FxTicker() {
  const [v, setV] = useState(0.01);
  useEffect(() => {
    const id = setInterval(() => setV(p => +(Math.max(-0.04, Math.min(0.04, p + (Math.random()-0.5)*0.01)).toFixed(2))), 4000);
    return () => clearInterval(id);
  }, []);
  const up = v >= 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`h-2 w-2 rounded-full ${up ? "bg-emerald-400" : "bg-rose-400"} animate-pulse`} />
      <span className="text-white/70">Mid-market drift</span>
      <span className={`num ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? "+" : ""}{v.toFixed(2)}%</span>
    </div>
  );
}
