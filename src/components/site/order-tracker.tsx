"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, MessageCircle, Phone, Star } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useApiMutation } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { STATUS_META, trackingSteps, type OrderStatus, type OrderType } from "@/lib/order-status";
import { whatsappLink } from "@/utils/phone";
import type { PublicOrder } from "@/types/api";
import { StarRating } from "@/components/shared/star-rating";
import { cn } from "@/lib/utils";

const TERMINAL = ["COMPLETED", "CANCELLED"];

function Stepper({ order }: { order: PublicOrder }) {
  const { time } = useFormat();
  const steps = trackingSteps(order.type as OrderType);
  const current = steps.indexOf(order.status as OrderStatus);
  const stamp = (s: OrderStatus) => order.events.find((e) => e.status === s)?.createdAt;
  const cancelled = order.status === "CANCELLED";

  return (
    <ol className="grid gap-0 md:grid-flow-col md:auto-cols-fr" aria-label="Order progress">
      {steps.map((s, i) => {
        const done = !cancelled && i < current;
        const now = !cancelled && i === current;
        const ts = stamp(s);
        return (
          <li key={s} className="relative flex gap-4 pb-8 last:pb-0 md:flex-col md:items-center md:gap-3 md:pb-0 md:text-center" aria-current={now ? "step" : undefined}>
            {i < steps.length - 1 && <span aria-hidden className={cn("absolute start-[19px] top-10 h-[calc(100%-2.5rem)] w-px md:start-1/2 md:top-[19px] md:h-px md:w-full", done ? "bg-primary" : "bg-border")} />}
            <span className={cn("relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 transition-colors", done && "border-primary bg-primary text-primary-foreground", now && "border-primary bg-background text-primary", !done && !now && "border-border bg-background text-muted-foreground/50")}>
              {done ? <Check className="size-4" /> : now ? <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-primary" /></span> : <span className="size-2 rounded-full bg-current" />}
            </span>
            <span className="min-w-0 pt-2 md:pt-0">
              <span className={cn("block text-[14px] md:text-[13px]", now ? "font-medium" : done ? "" : "opacity-50")}>{STATUS_META[s].customerLabel}</span>
              <span className="block text-[12px] font-light text-muted-foreground tabular">{ts && (done || now) ? time(ts) : "\u00A0"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ReviewForm({ order }: { order: PublicOrder }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string>();
  const submit = useApiMutation(() => api.post(`/api/public/orders/${order.id}/review`, { rating, comment: comment.trim() || undefined }), {
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-order", order.id] }),
    onError: (e) => { setErr(e.message); return true; },
  });

  if (order.review) {
    return (
      <section className="border p-6 text-center" aria-live="polite">
        <StarRating value={order.review.rating} size={20} className="justify-center" />
        <p className="font-display mt-3 text-[26px]">Thank you for your review</p>
        <p className="mt-1 text-[13px] font-light text-muted-foreground">{order.review.status === "PENDING" ? "It will appear on our website once our team has read it." : "We really appreciate it."}</p>
      </section>
    );
  }
  return (
    <section className="border p-6" aria-labelledby="review-h">
      <h2 id="review-h" className="font-display text-[28px]">How was your meal?</h2>
      <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => { setRating(n); setErr(undefined); }} className="p-1 text-brass transition-transform hover:scale-110">
            <Star className={cn("size-8", n <= (hover || rating) ? "fill-current" : "fill-transparent opacity-40")} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} rows={3} placeholder="Tell us more (optional)" aria-label="Your review" className="mt-4 w-full rounded-md border bg-transparent px-4 py-3 text-[14px] font-light outline-none placeholder:opacity-45 focus:border-foreground" />
      {err && <p role="alert" className="mt-2 text-xs text-destructive">{err}</p>}
      <button type="button" disabled={!rating || submit.isPending} onClick={() => submit.mutate()} className="mt-4 inline-flex items-center gap-2 bg-primary px-6 py-3.5 text-[11px] uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{submit.isPending && <Loader2 className="size-3.5 animate-spin" />} Send review</button>
      {!rating && <p className="mt-2 text-xs text-muted-foreground">Choose a star rating to send your review.</p>}
    </section>
  );
}

export function OrderTracker({ initial, contact }: { initial: PublicOrder; contact: { phone: string | null; whatsapp: string | null; name: string } }) {
  const { money, dateTime, time } = useFormat();
  const { data: order = initial, isFetching } = useQuery<PublicOrder>({
    queryKey: ["public-order", initial.id],
    queryFn: () => api.get<PublicOrder>(`/api/public/orders/${initial.id}`),
    initialData: initial,
    refetchInterval: (q) => (TERMINAL.includes(q.state.data?.status ?? "") ? false : 8000),
  });
  const status = order.status as OrderStatus;
  const meta = STATUS_META[status];
  const active = !TERMINAL.includes(status);
  const delivery = order.type === "DELIVERY";
  const address = [order.addressLine, order.building && `Bldg ${order.building}`, order.floor && `Floor ${order.floor}`, order.apartment && `Apt ${order.apartment}`].filter(Boolean).join(", ");

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] opacity-55">Thank you, {order.customerName.split(" ")[0]}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[clamp(40px,6vw,64px)] font-normal leading-none tracking-[0.01em]">Order <span className="tabular">#{order.number}</span></h1>
          <span className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.14em]", status === "CANCELLED" && "border-destructive text-destructive")} role="status">
            {active && isFetching && <Loader2 className="size-3 animate-spin opacity-60" />}{meta.customerLabel}
          </span>
        </div>
        <p className="mt-4 max-w-xl text-[15px] font-light leading-relaxed text-muted-foreground">{meta.customerHint}{status === "CANCELLED" && order.cancelReason ? ` Reason: ${order.cancelReason}.` : ""}</p>
        {active && order.estimatedReadyAt && <p className="mt-2 text-[14px]">Estimated {delivery ? "arrival" : "ready time"}: <strong className="tabular font-medium">{time(order.estimatedReadyAt)}</strong></p>}
      </header>

      {status !== "CANCELLED" ? <section className="border bg-card p-6 md:p-8"><Stepper order={order} /></section> : (
        <section role="alert" className="border border-destructive/40 bg-destructive/[0.06] p-6 text-[14px]">This order was cancelled. If you were charged, we'll make sure you're refunded. Questions? Call us and quote order #{order.number}.</section>
      )}

      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="items-h">
          <h2 id="items-h" className="font-display mb-4 text-[28px]">Your order</h2>
          <ul className="divide-y border-y">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-4 text-[14px]">
                <span className="min-w-0"><span className="font-medium">{i.quantity} × {i.name}</span>{i.options.length > 0 && <span className="block text-[12.5px] font-light text-muted-foreground">{i.options.map((o) => o.name).join(" · ")}</span>}{i.notes && <span className="block text-[12.5px] italic text-muted-foreground">“{i.notes}”</span>}</span>
                <span className="tabular shrink-0">{money(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-[13.5px] font-light">
            <div className="flex justify-between"><dt className="opacity-65">Subtotal</dt><dd className="tabular">{money(order.subtotal)}</dd></div>
            {order.discountTotal > 0 && <div className="flex justify-between"><dt className="opacity-65">Discount ({order.couponCode})</dt><dd className="tabular">−{money(order.discountTotal)}</dd></div>}
            {delivery && <div className="flex justify-between"><dt className="opacity-65">Delivery</dt><dd className="tabular">{order.deliveryFee ? money(order.deliveryFee) : "Free"}</dd></div>}
            {order.serviceFee > 0 && <div className="flex justify-between"><dt className="opacity-65">Service fee</dt><dd className="tabular">{money(order.serviceFee)}</dd></div>}
            <div className="flex justify-between"><dt className="opacity-65">Tax</dt><dd className="tabular">{money(order.taxTotal)}</dd></div>
            <div className="flex items-baseline justify-between border-t pt-3"><dt className="font-display text-[22px]">Total</dt><dd className="font-display tabular text-[24px]">{money(order.total)}</dd></div>
          </dl>
        </section>

        <aside className="space-y-6 text-[14px]">
          <div><h3 className="mb-2 text-[10px] uppercase tracking-[0.2em] opacity-55">{delivery ? "Delivering to" : order.type === "PICKUP" ? "Pickup" : "Dine-in"}</h3>{delivery ? <p className="font-light leading-relaxed">{order.zoneName}<br />{address}</p> : <p className="font-light">Collect from {contact.name}.</p>}</div>
          <div><h3 className="mb-2 text-[10px] uppercase tracking-[0.2em] opacity-55">Payment</h3><p className="font-light">{order.payment?.method === "ONLINE" ? "Paid online" : delivery ? "Cash on delivery" : "Pay at pickup"} — <span className="capitalize">{order.payment?.status.toLowerCase()}</span></p></div>
          <div><h3 className="mb-2 text-[10px] uppercase tracking-[0.2em] opacity-55">Placed</h3><p className="font-light">{dateTime(order.placedAt)}</p></div>
          <div className="space-y-2 border-t pt-6">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-55">Need help?</p>
            {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2.5 hover:underline"><Phone className="size-4" /> {contact.phone}</a>}
            {contact.whatsapp && <a href={whatsappLink(contact.whatsapp, `Hello, about my order #${order.number}`)} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:underline"><MessageCircle className="size-4" /> WhatsApp us</a>}
          </div>
        </aside>
      </div>

      {status === "COMPLETED" && <ReviewForm order={order} />}
      <div className="flex flex-wrap gap-4 border-t pt-8 text-[12px] uppercase tracking-[0.14em]"><Link href="/menu" className="opacity-70 hover:opacity-100">Order again →</Link><Link href="/" className="opacity-70 hover:opacity-100">Back home</Link></div>
    </div>
  );
}
