"use client";

import { useRouter } from "next/navigation";
import { Bike, Clock, Store } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useFormat } from "@/hooks/use-restaurant";
import { cn } from "@/lib/utils";

interface Zone { id: string; name: string; fee: number; etaMinutes: number; minOrder: number }

/** The olive strip under the hero (the reference's reservation bar), repurposed for online ordering. */
export function OrderBar({ zones, deliveryEnabled, pickupEnabled, accepting }: { zones: Zone[]; deliveryEnabled: boolean; pickupEnabled: boolean; accepting: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { money } = useFormat();
  const { orderType, zoneId, setOrderType, setZone } = useCart();
  const canDeliver = deliveryEnabled && zones.length > 0;
  const type = hydrated ? (orderType === "DELIVERY" && !canDeliver ? "PICKUP" : orderType) : "DELIVERY";
  const zone = zones.find((z) => z.id === zoneId);

  return (
    <section aria-label="Order online" className="relative z-10 grid bg-[#30372a] text-white md:grid-cols-[1.1fr_1.5fr_1.5fr_1.2fr] md:pl-[8vw]">
      <div className="flex flex-col justify-center border-b border-white/25 px-5 py-5 md:border-b-0 md:border-e md:px-0 md:pe-6">
        <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">Order</span>
        <strong className="font-display text-[23px] font-normal tracking-[0.03em]">Online</strong>
      </div>

      <div className="flex items-center gap-3 border-b border-white/25 px-5 py-4 md:min-h-[76px] md:border-b-0 md:border-e md:px-6">
        <div className="inline-flex rounded-full bg-white/10 p-1" role="group" aria-label="Order type">
          {([["DELIVERY", "Delivery", Bike, canDeliver], ["PICKUP", "Pickup", Store, pickupEnabled]] as const).map(([t, label, Icon, on]) => (
            <button key={t} type="button" disabled={!on} onClick={() => setOrderType(t)} aria-pressed={type === t} className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors disabled:opacity-40", type === t ? "bg-[#eee7dc] text-[#191510]" : "text-white/80 hover:text-white")}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-white/25 px-5 py-4 md:min-h-[76px] md:border-b-0 md:border-e md:px-6">
        {type === "DELIVERY" ? (
          <label className="block w-full">
            <span className="block text-[9px] uppercase tracking-[0.18em] opacity-60">Delivery area</span>
            <select value={zoneId} onChange={(e) => setZone(e.target.value)} className="mt-0.5 w-full appearance-none bg-transparent font-display text-[18px] outline-none [&>option]:text-black" aria-label="Delivery area">
              <option value="">Choose your area…</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </label>
        ) : (
          <div><span className="block text-[9px] uppercase tracking-[0.18em] opacity-60">Collect from</span><span className="font-display text-[18px]">The restaurant</span></div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
        <div className="flex items-center gap-2 text-[12px] opacity-80"><Clock className="size-4 shrink-0" /><span>{type === "DELIVERY" ? (zone ? `${zone.etaMinutes} min · ${money(zone.fee)}` : "Fee shown at checkout") : "Ready in ~20 min"}</span></div>
        <button type="button" disabled={!accepting} onClick={() => router.push("/menu")} className="whitespace-nowrap bg-[#eee7dc] px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-[#191510] transition-all hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
          {accepting ? "Start order" : "Paused"}
        </button>
      </div>
    </section>
  );
}
