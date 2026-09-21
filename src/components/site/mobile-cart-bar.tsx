"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { cartCount, cartSubtotalEstimate, useCart } from "@/lib/cart-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useFormat } from "@/hooks/use-restaurant";

/** Sticky "View cart" bar on phones while browsing the menu. */
export function MobileCartBar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const { money } = useFormat();
  const count = cartCount(lines);
  if (!hydrated || count === 0 || !(pathname.startsWith("/menu") || pathname === "/")) return null;
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 p-3 sm:hidden">
      <Link href="/cart" className="flex items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-primary-foreground shadow-xl">
        <span className="flex items-center gap-2.5 text-sm font-medium"><ShoppingBag className="size-[18px]" /> View cart · <span className="tabular">{count}</span> {count === 1 ? "item" : "items"}</span>
        <span className="tabular text-sm font-semibold">{money(cartSubtotalEstimate(lines))}</span>
      </Link>
    </div>
  );
}
