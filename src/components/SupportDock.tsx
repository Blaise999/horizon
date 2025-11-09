"use client";

import { HelpCircle, X } from "lucide-react";
import { useState } from "react";

export default function SupportDock() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Open support"
        className="fixed bottom-5 right-5 h-12 w-12 rounded-full bg-white/10 border border-[var(--c-hairline)] backdrop-blur-sm hover:bg-white/15 flex items-center justify-center"
        onClick={()=>setOpen(true)}
      >
        <HelpCircle />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-lg" onClick={()=>setOpen(false)}>
          <div className="absolute bottom-5 right-5 w-[320px]" onClick={(e)=>e.stopPropagation()}>
            <div className="card p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Need help?</div>
                <button className="h-9 w-9 rounded-xl hover:bg-white/10" onClick={()=>setOpen(false)}><X/></button>
              </div>
              <div className="text-sm text-[var(--c-text-2)]">Pick a tab:</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <a className="card px-3 py-2 text-center" href="#status">Status</a>
                <a className="card px-3 py-2 text-center" href="#help-center">Help Center</a>
                <a className="card px-3 py-2 text-center" href="#chat">Chat</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
