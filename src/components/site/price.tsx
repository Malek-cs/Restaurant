"use client";

import { useFormat } from "@/hooks/use-restaurant";
import { cn } from "@/lib/utils";

export function Price({ price, discountPrice, className, from }: { price: number; discountPrice: number | null; className?: string; from?: boolean }) {
  const { money } = useFormat();
  const hasDiscount = discountPrice != null && discountPrice < price;
  return (
    <span className={cn("tabular font-display", className)}>
      {from && <span className="me-1 font-sans text-[10px] uppercase tracking-wider opacity-60">from</span>}
      {hasDiscount ? (
        <>
          <span>{money(discountPrice!)}</span>
          <span className="ms-2 text-[0.8em] line-through opacity-50">{money(price)}</span>
        </>
      ) : (
        money(price)
      )}
    </span>
  );
}
