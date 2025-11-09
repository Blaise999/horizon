"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

type LogoProps = {
  /** Pixel height of the logo mark (the circle). Defaults to 56 on mobile, 64+ on desktop via CSS. */
  height?: number;
  /** Path to the round logomark image. */
  src?: string;
  /** Optional wordmark to the right of the mark. If omitted, only the mark renders. */
  wordmarkSrc?: string;
  /** Show the wordmark next to the mark (if you passed wordmarkSrc). Default: true */
  showWordmark?: boolean;
  /** Wrap the logo in a link. Pass null to render as a plain div. Default: "/" */
  href?: string | null;
  /** Add the cyan glow used in your Nav. */
  glow?: boolean;
  /** Forwarded className for outer wrapper. */
  className?: string;
  /** Alt text (accessibility). Defaults to "Horizon". */
  alt?: string;
  /** Next/Image priority flag (true for hero / above the fold). */
  priority?: boolean;
  /** Tighten horizontal gap between mark and wordmark */
  gap?: number;
};

export default function Logo({
  height = 56,
  src = "/hero/logo.png",
  wordmarkSrc,
  showWordmark = true,
  href = "/",
  glow = true,
  className = "",
  alt = "Horizon",
  priority = false,
  gap = 10,
}: LogoProps) {
  const Wrapper = href ? Link : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      aria-label={href ? "Horizon Home" : undefined}
      className={`inline-flex items-center select-none ${className}`}
      style={{
        // small responsive bump without needing media queries in every caller
        // callers can still override via className if they want
        transform: "translateZ(0)", // avoid blurriness on transforms
      }}
    >
      {/* Mark */}
      <Image
        src={src}
        alt={alt}
        width={Math.round(height)}                // keep it roughly square
        height={Math.round(height)}
        priority={priority}
        draggable={false}
        style={{
          height,
          width: "auto",
          filter: glow ? "drop-shadow(0 0 12px rgba(0,212,255,0.45))" : undefined,
        }}
      />

      {/* Optional wordmark */}
      {showWordmark && wordmarkSrc && (
        <span
          aria-hidden
          style={{ display: "inline-flex", marginLeft: gap }}
        >
          <Image
            src={wordmarkSrc}
            alt=""
            width={140}
            height={Math.round(height * 0.55)}
            priority={priority}
            draggable={false}
            style={{
              height: Math.round(height * 0.55),
              width: "auto",
              filter: glow ? "drop-shadow(0 0 10px rgba(0,212,255,0.35))" : undefined,
            }}
          />
        </span>
      )}
    </Wrapper>
  );
}

/**
 * Convenience tiny variant (e.g., footer)
 */
export function LogoMini(props: Partial<LogoProps>) {
  return <Logo height={40} showWordmark={false} glow={false} {...props} />;
}
