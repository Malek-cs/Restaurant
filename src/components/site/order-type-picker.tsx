"use client";

import { Bike, Store } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { usePublicConfig } from "@/hooks/use-public-config";
import { useFormat } from "@/hooks/use-restaurant";
import { cn } from "@/lib/utils";

/** Delivery/pickup toggle + delivery area select, shared by cart and checkout. Reads and writes the cart store. */
export function OrderTypePicker({ zoneError }: { zoneError?: string }) {
  const { orderType, zoneId, setOrderType, setZone } = useCart();
  const { data: cfg } = usePublicConfig();
  const { money } = useFormat();
  const canDeliver = !!cfg?.deliveryEnabled && (cfg?.zones.length ?? 0) > 0;
  const canPickup = cfg?.pickupEnabled ?? true;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Order type">
        {([["DELIVERY", "Delivery", Bike, canDeliver], ["PICKUP", "Pickup", Store, canPickup]] as const).map(([t, label, Icon, on]) => (
          <button key={t} type="button" disabled={!on} onClick={() => setOrderType(t)} aria-pressed={orderType === t} className={cn("flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-[11px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-40", orderType === t ? "border-foreground bg-foreground text-background" : "hover:border-foreground/50")}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      {orderType === "DELIVERY" && (
        <div>
          <label htmlFor="zone" className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] opacity-55">Delivery area</label>
          <select id="zone" value={zoneId} onChange={(e) => setZone(e.target.value)} aria-invalid={!!zoneError} className={cn("h-11 w-full rounded-md border bg-transparent px-3 text-[14px] outline-none focus:border-foreground", zoneError && "border-destructive")}>
            <option value="">Choose your area…</option>
            {cfg?.zones.map((z) => <option key={z.id} value={z.id}>{z.name} — {money(z.fee)} · ~{z.etaMinutes} min</option>)}
          </select>
          {zoneError && <p role="alert" className="mt-1 text-xs text-destructive">{zoneError}</p>}
        </div>
      )}
    </div>
  );
}
