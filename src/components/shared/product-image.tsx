"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Image with a graceful typographic fallback when the URL is missing or fails to load. */
export function ProductImage({ src, alt, className, sizes = "(max-width: 768px) 100vw, 400px", priority, rounded = true }: { src?: string | null; alt: string; className?: string; sizes?: string; priority?: boolean; rounded?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("relative grid place-items-center overflow-hidden bg-[color-mix(in_srgb,var(--primary)_14%,var(--muted))] text-primary", rounded && "rounded-[inherit]", className)}
      >
        <span className="font-display select-none text-[clamp(28px,30%,56px)] leading-none opacity-70">{alt.trim().charAt(0).toUpperCase()}</span>
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 10px)" }} />
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" onError={() => setFailed(true)} />
    </div>
  );
}
