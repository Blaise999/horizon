// components/QuickActions.tsx
"use client";
import { Plus, ArrowRightLeft, QrCode, Upload } from "lucide-react";

const Chip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <button className="shrink-0 snap-start px-4 py-3 rounded-xl bg-white/[.06] hover:bg-white/[.09] border border-white/10 text-sm inline-flex items-center gap-2">
    {icon}<span>{label}</span>
  </button>
);

export default function QuickActions() {
  return (
    <div className="mt-4 -mx-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
      <div className="px-1 flex gap-2 snap-x snap-mandatory">
        <Chip icon={<Plus size={16}/>} label="Add Money" />
        <Chip icon={<ArrowRightLeft size={16}/>} label="Transfer" />
        <Chip icon={<QrCode size={16}/>} label="Pay QR" />
        <Chip icon={<Upload size={16}/>} label="Top-up" />
      </div>
    </div>
  );
}
