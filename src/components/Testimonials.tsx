"use client";

import { Star } from "lucide-react";

export default function Testimonials() {
  const items = [
    { n: "Ava S.", t: "Balances update instantly. It feels alive.", r: 5 },
    { n: "Noah W.", t: "Insights helped me save $300 in a month.", r: 5 },
    { n: "Grace T.", t: "Transfers to the US & UK are smooth.", r: 5 },
    { n: "Liam R.", t: "Cards glow and freeze in one tap.", r: 5 },
  ];
  return (
    <section className="container-x section-pad">
      <div className="flex items-center justify-between">
        <h2 className="text-[28px] md:text-[36px] font-semibold">What users say</h2>
        <div className="text-sm text-[var(--c-text-2)]">4.9★ from 8,000+ reviews</div>
      </div>
      <div className="mt-8 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {items.map((u, i) => (
            <div key={i} className="card card-hover p-6 w-72">
              <div className="flex items-center justify-between">
                <div className="font-medium">{u.n}</div>
                <div className="flex items-center gap-1 text-[var(--c-cyan)]">
                  {Array.from({ length: u.r }).map((_, j) => <Star key={j} size={14}/>)}
                </div>
              </div>
              <p className="mt-3 text-[var(--c-text-2)]">{u.t}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
