// components/ProgressRing.tsx
"use client";
export default function ProgressRing({
  size = 40, stroke = 6, value = 0.42, track = "rgba(255,255,255,.12)", fill = "#00E0FF",
}: { size?: number; stroke?: number; value?: number; track?: string; fill?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, value)) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none"/>
      <circle
        cx={size/2} cy={size/2} r={r}
        stroke={`url(#grad)`} strokeLinecap="round" strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <defs>
        <linearGradient id="grad" x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="#00E0FF"/><stop offset="1" stopColor="#9B5CFF"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
