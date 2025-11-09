"use client";

// Drop this file at: /components/ui/primitives.tsx (or any path you prefer)
// Then, EITHER update your imports to point to this file (recommended):
//    import { Button, Input, Label, Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Progress, cn } from "@/components/ui/primitives";
// OR copy‑paste into the individual files you plan to create later.

import React, { forwardRef, useEffect, useId, useRef, useState, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";

// ——————————————————————————————————————————
// util: classnames combiner
// ——————————————————————————————————————————
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ——————————————————————————————————————————
// Button
// ——————————————————————————————————————————
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost";
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  className,
  variant = "default",
  ...props
}, ref) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] text-black hover:brightness-110",
    secondary: "bg-white/10 hover:bg-white/20 text-[#E6EEF7]",
    ghost: "bg-transparent hover:bg-white/10 text-[#E6EEF7]",
  } as const;
  return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />;
});

// ——————————————————————————————————————————
// Input
// ——————————————————————————————————————————
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#E6EEF7] placeholder:text-[#9BB0C6] focus:outline-none focus:ring-2 focus:ring-[#00E0FF]/50",
        className
      )}
      {...props}
    />
  );
});

// ——————————————————————————————————————————
// Label
// ——————————————————————————————————————————
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...props }) => (
  <label className={cn("text-xs text-[#9BB0C6]", className)} {...props} />
);

// ——————————————————————————————————————————
// Checkbox
// ——————————————————————————————————————————
export const Checkbox = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 appearance-none rounded-md border border-white/20 bg-white/5 grid place-items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00E0FF]/50 checked:bg-[#00E0FF] checked:border-transparent",
        className
      )}
      {...props}
    />
  );
});

// ——————————————————————————————————————————
// Select (very lightweight)
// ——————————————————————————————————————————
// Usage mirrors shadcn API: Select + Trigger/Content/Item/Value
export const SelectContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  value?: string;
  onValueChange?: (v: string) => void;
}>({ open: false, setOpen: () => {} });

export const Select: React.FC<{ value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }>
= ({ value, onValueChange, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <SelectContext.Provider value={{ open, setOpen, value, onValueChange }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, children, ...props }) => {
  const ctx = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn("w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-[#E6EEF7]", className)}
      {...props}
    >
      {children}
    </button>
  );
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = React.useContext(SelectContext);
  return (
    <span className="text-[#E6EEF7]">
      {ctx.value || <span className="text-[#9BB0C6]">{placeholder ?? "Select"}</span>}
    </span>
  );
};

export const SelectContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
  const ctx = React.useContext(SelectContext);
  if (!ctx.open) return null;
  return (
    <div className={cn("absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-[#0F1622] p-1 shadow-xl", className)}>
      {children}
    </div>
  );
};

export const SelectItem: React.FC<{ value: string; children: React.ReactNode } & HTMLAttributes<HTMLButtonElement>> = ({ value, children, className, ...props }) => {
  const ctx = React.useContext(SelectContext);
  const selected = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => { ctx.onValueChange?.(value); ctx.setOpen(false); }}
      className={cn("w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-white/10", selected && "bg-white/10", className)}
      {...props}
    >
      {children}
    </button>
  );
};

// ——————————————————————————————————————————
// Dialog (modal)
// ——————————————————————————————————————————
const DialogCtx = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });
export const Dialog: React.FC<{ open?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode }>
= ({ open, onOpenChange, children }) => {
  const [internal, setInternal] = useState(false);
  const controlled = typeof open === "boolean";
  const isOpen = controlled ? open! : internal;
  const setOpen = (v: boolean) => (controlled ? onOpenChange?.(v) : setInternal(v));
  return <DialogCtx.Provider value={{ open: isOpen, setOpen }}>{children}</DialogCtx.Provider>;
};

export const DialogTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ asChild, children, ...props }) => {
  const { setOpen } = React.useContext(DialogCtx);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, { onClick: () => setOpen(true) });
  }
  return <button {...props} onClick={() => setOpen(true)}>{children}</button>;
};

export const DialogContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
  const { open, setOpen } = React.useContext(DialogCtx);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open) return null;
  const body = (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className={cn("absolute left-1/2 top-1/2 w-[min(560px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0F1622] p-4 text-[#E6EEF7] shadow-2xl", className)}>
        {children}
      </div>
    </div>
  );
  return mounted ? createPortal(body, document.body) : null;
};

export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-1">{children}</div>
);
export const DialogTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h3 className={cn("text-lg font-semibold", className)}>{children}</h3>
);
export const DialogDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cn("text-sm text-[#9BB0C6]", className)}>{children}</p>
);

// ——————————————————————————————————————————
// Tooltip (very simple)
// ——————————————————————————————————————————
const TooltipCtx = React.createContext<{ content?: React.ReactNode }>({});
export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => <TooltipCtx.Provider value={{}}>{children}</TooltipCtx.Provider>;
export const TooltipTrigger: React.FC<React.HTMLAttributes<HTMLElement>> = ({ children, ...props }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} {...props}>
      {children}
      {/* the content will be rendered by sibling TooltipContent */}
      <span data-open={open} className="sr-only" />
    </span>
  );
};
export const TooltipContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
  // naive implementation that reads the previous sibling's data-open state
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const host = ref.current?.previousElementSibling as HTMLElement | null;
    const update = () => setOpen(host?.querySelector('[data-open]')?.getAttribute('data-open') === 'true');
    update();
    const id = setInterval(update, 50);
    return () => clearInterval(id);
  }, []);
  if (!open) return null;
  return (
    <div ref={ref} className={cn("absolute z-50 mt-2 rounded-md border border-white/10 bg-[#0F1622] px-2 py-1 text-xs text-[#E6EEF7] shadow", className)}>
      {children}
    </div>
  );
};

// ——————————————————————————————————————————
// Progress
// ——————————————————————————————————————————
export const Progress: React.FC<{ value?: number; className?: string }> = ({ value = 0, className }) => (
  <div className={cn("w-full h-2 rounded bg-white/10 overflow-hidden", className)}>
    <div className="h-full bg-gradient-to-r from-[#00B4D8] to-[#00E0FF]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);
