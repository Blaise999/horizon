"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type BaseProps = React.PropsWithChildren<{
  href: string;
  className?: string;
  prefetch?: boolean;
  replace?: boolean;
  onClick?: () => void;
}>;

export function SmartLink({ href, className, prefetch = true, replace, onClick, children }: BaseProps) {
  const isInternal = href.startsWith("/");
  if (!isInternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} prefetch={prefetch} replace={replace} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <SmartLink
      href={href}
      className={
        "text-sm transition-colors " +
        (active ? "text-white" : "text-[#9BB0C6] hover:text-white")
      }
    >
      <span aria-current={active ? "page" : undefined}>{children}</span>
    </SmartLink>
  );
}