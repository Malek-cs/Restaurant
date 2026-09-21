"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useCart } from "@/lib/cart-store";
import { useHydrated } from "@/hooks/use-hydrated";
import type { QuoteResult } from "@/types/api";

/** Server-authoritative price for the current cart (fees, coupon, tax, availability). */
export function useCartQuote(phone?: string) {
  const hydrated = useHydrated();
  const { lines, orderType, zoneId, couponCode } = useCart();
  const items = lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.options.map((o) => o.id), notes: l.notes || undefined }));
  const enabled = hydrated && items.length > 0;
  const query = useQuery<QuoteResult>({
    queryKey: ["quote", items, orderType, zoneId, couponCode, phone ?? ""],
    queryFn: () => api.post<QuoteResult>("/api/public/quote", { type: orderType, zoneId: orderType === "DELIVERY" && zoneId ? zoneId : undefined, couponCode: couponCode || undefined, phone: phone || undefined, items }),
    enabled,
    placeholderData: (p) => p,
    staleTime: 10_000,
  });
  return { ...query, hydrated, lines, orderType, zoneId, couponCode, empty: hydrated && items.length === 0 };
}
