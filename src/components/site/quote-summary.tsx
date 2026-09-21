"use client";

import { useFormat } from "@/hooks/use-restaurant";
import type { QuoteResult } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";

export function QuoteSummary({ q, loading, delivery }: { q?: QuoteResult; loading?: boolean; delivery: boolean }) {
  const { money } = useFormat();
  if (!q) return <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4" />)}</div>;
  const row = (l: string, v: string, dim?: boolean) => <div className="flex justify-between"><dt className={dim ? "opacity-60" : ""}>{l}</dt><dd className="tabular">{v}</dd></div>;
  return (
    <dl className={`space-y-2.5 text-[13.5px] font-light transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      {row("Subtotal", money(q.subtotal), true)}
      {q.discountTotal > 0 && row(`Discount (${q.coupon?.code})`, `−${money(q.discountTotal)}`, true)}
      {delivery && row("Delivery", q.zone ? (q.deliveryFee ? money(q.deliveryFee) : "Free") : "Choose an area", true)}
      {q.serviceFee > 0 && row("Service fee", money(q.serviceFee), true)}
      {row(`Tax (${q.taxRate}%)`, money(q.taxTotal), true)}
      <div className="flex items-baseline justify-between border-t pt-3.5 text-foreground"><dt className="font-display text-[22px]">Total</dt><dd className="font-display tabular text-[24px]">{money(q.total)}</dd></div>
    </dl>
  );
}
