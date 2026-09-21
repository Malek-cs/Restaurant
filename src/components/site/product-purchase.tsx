"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type { PublicProduct } from "@/services/menu.service";
import { useCart } from "@/lib/cart-store";
import { effectivePrice } from "@/lib/pricing";
import { useFormat } from "@/hooks/use-restaurant";
import { cn } from "@/lib/utils";

export function ProductPurchase({ product: p }: { product: PublicProduct }) {
  const { money } = useFormat();
  const add = useCart((s) => s.add);
  const sizes = p.options.filter((o) => o.type === "SIZE");
  const addons = p.options.filter((o) => o.type === "ADDON");
  const [size, setSize] = useState(sizes.find((s) => s.isDefault)?.id ?? sizes[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  const chosen = [...sizes.filter((s) => s.id === size), ...addons.filter((a) => picked.includes(a.id))];
  const unit = effectivePrice(p) + chosen.reduce((s, o) => s + o.priceDelta, 0);

  function onAdd() {
    add({ productId: p.id, slug: p.slug, name: p.name, imageUrl: p.imageUrl, unitPrice: unit, quantity: qty, options: chosen, notes: notes.trim() || undefined });
    setAdded(true);
    toast.success(`${qty} × ${p.name} added to your cart`);
    setTimeout(() => setAdded(false), 2200);
  }

  return (
    <div className="mt-7 space-y-7">
      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-[10px] uppercase tracking-[0.2em] opacity-55">Size</legend>
          <div className="grid grid-cols-2 gap-3">
            {sizes.map((s) => (
              <label key={s.id} className={cn("flex cursor-pointer items-center justify-between rounded-md border px-4 py-3.5 text-[14px] transition-colors", size === s.id ? "border-foreground bg-foreground/[0.04]" : "hover:border-foreground/40")}>
                <span className="flex items-center gap-3"><input type="radio" name="size" value={s.id} checked={size === s.id} onChange={() => setSize(s.id)} className="accent-[var(--primary)]" />{s.name}</span>
                <span className="tabular text-[13px] opacity-65">{s.priceDelta ? `${s.priceDelta > 0 ? "+" : "−"}${money(Math.abs(s.priceDelta))}` : "Included"}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {addons.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-[10px] uppercase tracking-[0.2em] opacity-55">Add-ons</legend>
          <div className="space-y-2.5">
            {addons.map((a) => (
              <label key={a.id} className={cn("flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 text-[14px] transition-colors", picked.includes(a.id) ? "border-foreground bg-foreground/[0.04]" : "hover:border-foreground/40")}>
                <span className="flex items-center gap-3"><input type="checkbox" checked={picked.includes(a.id)} onChange={(e) => setPicked((c) => (e.target.checked ? [...c, a.id] : c.filter((x) => x !== a.id)))} className="accent-[var(--primary)]" />{a.name}</span>
                <span className="tabular text-[13px] opacity-65">+{money(a.priceDelta)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div>
        <label htmlFor="notes" className="mb-2 block text-[10px] uppercase tracking-[0.2em] opacity-55">Special requests</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} rows={2} placeholder="e.g. no onions, extra lemon" className="w-full rounded-md border bg-transparent px-4 py-3 text-[14px] font-light outline-none transition-colors placeholder:opacity-45 focus:border-foreground" />
      </div>

      <div className="flex flex-wrap items-stretch gap-3">
        <div className="inline-flex items-center rounded-md border" role="group" aria-label="Quantity">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-12 place-items-center transition-colors hover:bg-foreground/5" aria-label="Decrease quantity"><Minus className="size-4" /></button>
          <span className="tabular w-10 text-center text-[15px]" aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} className="grid size-12 place-items-center transition-colors hover:bg-foreground/5" aria-label="Increase quantity"><Plus className="size-4" /></button>
        </div>
        <button type="button" onClick={onAdd} disabled={!p.isAvailable} className="flex h-12 min-w-[220px] flex-1 items-center justify-between gap-6 bg-primary px-6 text-[11px] uppercase tracking-[0.15em] text-primary-foreground transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
          <span className="inline-flex items-center gap-2">{added ? <><Check className="size-4" /> Added</> : p.isAvailable ? "Add to cart" : "Sold out"}</span>
          {p.isAvailable && <span className="tabular font-sans text-[13px] tracking-normal">{money(unit * qty)}</span>}
        </button>
      </div>
      {added && <p role="status" className="text-[13px] text-muted-foreground">Added. <Link href="/cart" className="underline">View cart</Link> or keep browsing.</p>}
    </div>
  );
}
