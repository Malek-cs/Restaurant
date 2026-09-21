"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2, Minus, Plus, ShoppingBag, StickyNote, Tag, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { useFormat } from "@/hooks/use-restaurant";
import { ProductImage } from "@/components/shared/product-image";
import { OrderTypePicker } from "@/components/site/order-type-picker";
import { QuoteSummary } from "@/components/site/quote-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export function CartView() {
  const { money } = useFormat();
  const { setQty, remove, setNotes, setCoupon } = useCart();
  const { data: quote, isFetching, error, refetch, lines, orderType, zoneId, couponCode, hydrated, empty } = useCartQuote();
  const [code, setCode] = useState("");
  const [noteOpen, setNoteOpen] = useState<string | null>(null);

  if (!hydrated) return <div className="grid gap-10 lg:grid-cols-[1fr_400px]"><Skeleton className="h-64" /><Skeleton className="h-80" /></div>;

  if (empty) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <span className="mb-6 grid size-16 place-items-center rounded-full border"><ShoppingBag className="size-6 opacity-60" /></span>
        <p className="font-display text-[34px]">Your cart is empty</p>
        <p className="mt-2 max-w-sm text-[14px] font-light text-muted-foreground">Add a few dishes and they'll wait for you here.</p>
        <Link href="/menu" className="mt-8 inline-flex items-center gap-4 bg-primary px-6 py-4 text-[10px] uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-primary-hover">Browse the menu <ArrowRight className="size-3.5" /></Link>
      </div>
    );
  }

  const invalid = new Map(quote?.invalidItems.map((i) => [i.productId, i.reason]));
  const needsZone = orderType === "DELIVERY" && !zoneId;
  const blocked = !quote || quote.issues.length > 0 || needsZone || quote.lines.length === 0;
  const priceOf = (i: number) => quote?.lines[i]?.lineTotal;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
      <section aria-label="Cart items">
        <ul className="divide-y border-y">
          {lines.map((l, idx) => {
            const problem = invalid.get(l.productId);
            const lineTotal = quote && quote.lines.length === lines.length ? priceOf(idx) : undefined;
            return (
              <li key={l.key} className="py-5">
                <div className="flex gap-4">
                  <Link href={`/menu/${l.slug}`} className="shrink-0"><ProductImage src={l.imageUrl} alt={l.name} className="size-20 rounded-md sm:size-24" sizes="96px" /></Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/menu/${l.slug}`} className="font-display text-[21px] leading-tight hover:underline">{l.name}</Link>
                        {l.options.length > 0 && <p className="mt-0.5 text-[12px] font-light text-muted-foreground">{l.options.map((o) => o.name).join(" · ")}</p>}
                      </div>
                      <p className="font-display tabular shrink-0 text-[19px]">{money(lineTotal ?? l.unitPrice * l.quantity)}</p>
                    </div>
                    {l.notes && noteOpen !== l.key && <p className="mt-1 text-[12px] italic text-muted-foreground">“{l.notes}”</p>}
                    {problem && <p role="alert" className="mt-2 flex items-start gap-2 text-[12.5px] text-destructive"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {problem}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                      <div className="inline-flex items-center rounded-md border" role="group" aria-label={`Quantity of ${l.name}`}>
                        <button onClick={() => setQty(l.key, l.quantity - 1)} className="grid size-9 place-items-center hover:bg-foreground/5" aria-label={l.quantity === 1 ? `Remove ${l.name}` : "Decrease quantity"}>{l.quantity === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}</button>
                        <span className="tabular w-8 text-center text-[14px]">{l.quantity}</span>
                        <button onClick={() => setQty(l.key, l.quantity + 1)} className="grid size-9 place-items-center hover:bg-foreground/5" aria-label="Increase quantity"><Plus className="size-3.5" /></button>
                      </div>
                      <button onClick={() => setNoteOpen(noteOpen === l.key ? null : l.key)} className="inline-flex items-center gap-1.5 text-[12px] opacity-70 hover:opacity-100"><StickyNote className="size-3.5" /> {l.notes ? "Edit note" : "Add note"}</button>
                      <button onClick={() => remove(l.key)} className="text-[12px] opacity-70 hover:opacity-100 hover:text-destructive">Remove</button>
                    </div>
                    {noteOpen === l.key && <input autoFocus defaultValue={l.notes ?? ""} maxLength={200} placeholder="e.g. no onions" aria-label={`Note for ${l.name}`} onBlur={(e) => { setNotes(l.key, e.target.value.trim()); setNoteOpen(null); }} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="mt-3 h-10 w-full rounded-md border bg-transparent px-3 text-[14px] outline-none focus:border-foreground" />}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/menu" className="mt-6 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] opacity-70 hover:opacity-100">← Keep browsing</Link>
      </section>

      <aside aria-label="Order summary" className="space-y-6 border bg-card p-6 lg:sticky lg:top-28">
        <OrderTypePicker />
        <div>
          <label htmlFor="coupon" className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] opacity-55">Promo code</label>
          {quote?.coupon ? (
            <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-2.5 text-[13px]"><span className="inline-flex items-center gap-2"><Tag className="size-3.5" /><span className="font-mono tracking-wider">{quote.coupon.code}</span> applied</span><button onClick={() => { setCoupon(""); setCode(""); }} aria-label="Remove promo code" className="opacity-60 hover:opacity-100"><X className="size-4" /></button></div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) setCoupon(code.trim().toUpperCase()); }} className="flex gap-2">
              <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WELCOME10" autoComplete="off" aria-invalid={!!quote?.couponError} className="h-11 min-w-0 flex-1 rounded-md border bg-transparent px-3 text-[14px] uppercase tracking-wider outline-none focus:border-foreground" />
              <button type="submit" className="h-11 rounded-md border px-5 text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-foreground hover:text-background">Apply</button>
            </form>
          )}
          {couponCode && quote?.couponError && <p role="alert" className="mt-1.5 text-xs text-destructive">{quote.couponError}</p>}
        </div>

        {error ? <ErrorState message="We couldn't price your cart." onRetry={() => refetch()} className="py-6" /> : <QuoteSummary q={quote} loading={isFetching} delivery={orderType === "DELIVERY"} />}
        {quote && quote.issues.length > 0 && (
          <ul role="alert" className="space-y-1.5 rounded-md bg-destructive/8 p-3 text-[12.5px] text-destructive">{quote.issues.map((i) => <li key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{i}</li>)}</ul>
        )}
        {quote && needsZone && <p className="text-[12.5px] text-muted-foreground">Choose your delivery area to see the delivery fee.</p>}
        {quote && !blocked && <p className="text-[12.5px] font-light text-muted-foreground">Estimated {orderType === "DELIVERY" ? "delivery" : "ready"} in about {quote.etaMinutes} minutes.</p>}
        <Link href={blocked ? "#" : "/checkout"} aria-disabled={blocked} onClick={(e) => blocked && e.preventDefault()} className={cn("flex items-center justify-between bg-primary px-6 py-4 text-[11px] uppercase tracking-[0.15em] text-primary-foreground transition-all", blocked ? "cursor-not-allowed opacity-50" : "hover:bg-primary-hover")}>
          <span>Checkout</span>{isFetching ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4 rtl:rotate-180" />}
        </Link>
      </aside>
    </div>
  );
}
