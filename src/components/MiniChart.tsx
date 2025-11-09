"use client";

import { useEffect, useRef, useState } from "react";

type Pt = { x:number; y:number; v:number };

export default function MiniChart() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pts, setPts] = useState<Pt[]>([]);
  const [focus, setFocus] = useState<number | null>(null);

  useEffect(() => {
    // generate demo data
    const arr: Pt[] = Array.from({ length: 24 }).map((_, i) => ({ x:i, y: 0, v: 900 + Math.sin(i/2)*120 + i*12 }));
    setPts(arr);
  }, []);

  useEffect(() => {
    const c = ref.current; if (!c || !pts.length) return;
    const ctx = c.getContext("2d")!;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w; c.height = h;

    const min = Math.min(...pts.map(p=>p.v));
    const max = Math.max(...pts.map(p=>p.v));
    const px = (i:number)=> (i/(pts.length-1))* (w-16) + 8;
    const py = (v:number)=> h - ((v-min)/(max-min))*(h-16) - 8;

    ctx.clearRect(0,0,w,h);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gy=1; gy<4; gy++) { const y = (h/4)*gy; ctx.moveTo(0,y); ctx.lineTo(w,y); }
    ctx.stroke();

    // area
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,"rgba(0,226,255,0.18)");
    grad.addColorStop(1,"rgba(0,226,255,0.02)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px(0), py(pts[0].v));
    pts.forEach((p,i)=> ctx.lineTo(px(i), py(p.v)));
    ctx.lineTo(px(pts.length-1), h-8); ctx.lineTo(px(0), h-8); ctx.closePath();
    ctx.fill();

    // line
    ctx.strokeStyle = "#00E0FF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px(0), py(pts[0].v));
    pts.forEach((p,i)=> ctx.lineTo(px(i), py(p.v)));
    ctx.stroke();

    // dots
    ctx.fillStyle = "rgba(0,226,255,.9)";
    pts.forEach((p,i)=> {
      const x = px(i), y = py(p.v);
      ctx.beginPath(); ctx.arc(x,y, focus===i ? 4.5 : 3, 0, Math.PI*2); ctx.fill();
      if (focus===i) {
        // glow
        ctx.beginPath(); ctx.arc(x,y, 10, 0, Math.PI*2);
        ctx.fillStyle = "rgba(0,226,255,.18)"; ctx.fill();
      }
    });
  }, [pts, focus]);

  // keyboard scrub
  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!pts.length) return;
    if (e.key === "ArrowRight") setFocus((f)=> f===null?0: Math.min(pts.length-1, f+1));
    if (e.key === "ArrowLeft") setFocus((f)=> f===null?pts.length-1: Math.max(0, f-1));
  }

  return (
    <div className="card p-6 md:p-8" role="region" aria-label="Insights chart">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[18px] font-medium">Spending trend</div>
        <a href="#insights" className="px-3 py-1.5 rounded-[var(--r-chip)] text-black font-medium" style={{ backgroundColor: "var(--c-cta)" }}>
          Open Insights
        </a>
      </div>
      <div
        tabIndex={0}
        onKeyDown={onKey}
        className="relative h-48 outline-none"
        aria-label="Use left and right arrow keys to move between points"
        onMouseLeave={()=>setFocus(null)}
        onMouseMove={(e)=>{
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const idx = Math.round((x-8)/((rect.width-16)/(Math.max(1, pts.length-1))));
          setFocus(Math.max(0, Math.min(pts.length-1, idx)));
        }}
      >
        <canvas ref={ref} className="absolute inset-0 w-full h-full" />
        {focus!==null && pts[focus] && (
          <div className="absolute bottom-2 left-2 text-[12px] bg-black/50 rounded-[10px] px-2 py-1 border border-[var(--c-hairline)]">
            ${pts[focus].v.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}
