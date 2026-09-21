"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Banknote, CreditCard, Loader2, Lock } from "lucide-react";
import { createOrderSchema } from "@/lib/validation/order";
import { api, ApiClientError } from "@/lib/api/client";
import { useCart } from "@/lib/cart-store";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { usePublicConfig } from "@/hooks/use-public-config";
import { useApiMutation } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { QuoteSummary } from "@/components/site/quote-summary";
import { OrderTypePicker } from "@/components/site/order-type-picker";
import { Field, applyServerErrors } from "@/components/shared/field";
import { ProductImage } from "@/components/shared/product-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";

type Values = z.input<typeof createOrderSchema>;
const SAVED_KEY = "lumiere-customer-v1";

const inputCls = "h-11 w-full rounded-md border bg-transparent px-3 text-[14px] font-light outline-none transition-colors placeholder:opacity-45 focus:border-foreground aria-[invalid=true]:border-destructive";

export function CheckoutView() {
  const router = useRouter();
  const { money } = useFormat();
  const { data: cfg } = usePublicConfig();
  const { clear, setOrderType } = useCart();
  const form = useForm<Values>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { type: "DELIVERY", customer: { name: "", phone: "", email: "" }, zoneId: "", addressLine: "", building: "", floor: "", apartment: "", deliveryNotes: "", notes: "", paymentMethod: "CASH", items: [] },
  });
  const { register, setValue, control, formState: { errors, isDirty } } = form;
  const phone = useWatch({ control, name: "customer.phone" });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const { data: quote, isFetching, lines, orderType, zoneId, couponCode, hydrated, empty } = useCartQuote(phone && phone.length >= 7 ? phone : undefined);
  useUnsavedChangesWarning(isDirty && lines.length > 0);

  // Restore saved details, and mirror cart-store choices into the form.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null") as { name?: string; phone?: string; email?: string; addressLine?: string; building?: string; floor?: string; apartment?: string } | null;
      if (saved) {
        setValue("customer.name", saved.name ?? "");
        setValue("customer.phone", saved.phone ?? "");
        setValue("customer.email", saved.email ?? "");
        setValue("addressLine", saved.addressLine ?? "");
        setValue("building", saved.building ?? "");
        setValue("floor", saved.floor ?? "");
        setValue("apartment", saved.apartment ?? "");
      }
    } catch {}
  }, [setValue]);
  useEffect(() => { setValue("type", orderType); }, [orderType, setValue]);
  useEffect(() => {
    setValue("items", lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.options.map((o) => o.id), notes: l.notes || undefined })));
  }, [lines, setValue]);
  useEffect(() => { setValue("zoneId", zoneId || ""); }, [zoneId, setValue]);

  const place = useApiMutation((v: Values) => api.post<{ id: string; number: number }>("/api/public/orders", v), {
    onSuccess: (r, v) => {
      try { localStorage.setItem(SAVED_KEY, JSON.stringify({ name: v.customer.name, phone: v.customer.phone, email: v.customer.email, addressLine: v.addressLine, building: v.building, floor: v.floor, apartment: v.apartment })); } catch {}
      clear();
      router.push(`/order/${r.id}`);
    },
    onError: (e: ApiClientError) => applyServerErrors(form, e),
  });

  if (!hydrated) return <div className="grid gap-10 lg:grid-cols-[1fr_400px]"><Skeleton className="h-96" /><Skeleton className="h-80" /></div>;
  if (empty) {
    return <div className="py-20 text-center"><p className="font-display text-[32px]">Nothing to check out yet</p><Link href="/menu" className="mt-6 inline-block underline">Browse the menu</Link></div>;
  }

  const delivery = orderType === "DELIVERY";
  const submit = form.handleSubmit(
    (v) => place.mutate({ ...v, type: orderType, zoneId: delivery ? zoneId || undefined : undefined, couponCode: couponCode || undefined, items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.options.map((o) => o.id), notes: l.notes || undefined })) }),
    (errs) => {
      toast.error("Please check the highlighted fields.");
      const first = Object.keys(errs)[0];
      if (first === "customer") document.getElementById("name")?.focus();
      else if (first === "zoneId") document.getElementById("zone")?.focus();
      else if (first === "addressLine") document.getElementById("addr")?.focus();
    },
  );
  const blocking = quote?.issues ?? [];
  const closed = cfg && !cfg.openNow;

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
      <div className="space-y-12">
        {cfg && !cfg.acceptingOrders && <p role="alert" className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/8 p-4 text-[13.5px] text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> We're not taking online orders right now. Please check back soon.</p>}
        {closed && cfg?.acceptingOrders && <p role="status" className="rounded-md border p-4 text-[13.5px] font-light text-muted-foreground">We're outside opening hours right now. You can still place your order and we'll prepare it once we open.</p>}

        <fieldset className="space-y-5">
          <legend className="font-display mb-1 text-[28px]">1. Your details</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" required error={errors.customer?.name?.message}><input id="name" autoComplete="name" aria-invalid={!!errors.customer?.name} className={inputCls} {...register("customer.name")} /></Field>
            <Field label="Phone" htmlFor="phone" required error={errors.customer?.phone?.message} hint="We'll call or message if there's a problem"><input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="079 000 0000" aria-invalid={!!errors.customer?.phone} className={inputCls} {...register("customer.phone")} /></Field>
          </div>
          <Field label="Email (optional)" htmlFor="email" error={errors.customer?.email?.message}><input id="email" type="email" autoComplete="email" aria-invalid={!!errors.customer?.email} className={inputCls} {...register("customer.email")} /></Field>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="font-display mb-1 text-[28px]">2. {delivery ? "Delivery" : "Pickup"}</legend>
          <OrderTypePicker zoneError={errors.zoneId?.message} />
          {delivery && (
            <>
              <Field label="Street address" htmlFor="addr" required error={errors.addressLine?.message}><input id="addr" autoComplete="street-address" aria-invalid={!!errors.addressLine} className={inputCls} {...register("addressLine")} /></Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Building" htmlFor="bld"><input id="bld" className={inputCls} {...register("building")} /></Field>
                <Field label="Floor" htmlFor="flr"><input id="flr" className={inputCls} {...register("floor")} /></Field>
                <Field label="Apartment" htmlFor="apt"><input id="apt" className={inputCls} {...register("apartment")} /></Field>
              </div>
              <Field label="Delivery notes" htmlFor="dnotes" hint="Landmarks, gate codes, “call when outside”…"><textarea id="dnotes" rows={2} className={cn(inputCls, "h-auto py-3")} {...register("deliveryNotes")} /></Field>
            </>
          )}
          <Field label="Order notes" htmlFor="notes"><textarea id="notes" rows={2} placeholder="Allergies or anything the kitchen should know" className={cn(inputCls, "h-auto py-3")} {...register("notes")} /></Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-display mb-1 text-[28px]">3. Payment</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            
            {/* Cash Option */}
            <label className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors", paymentMethod === "CASH" ? "border-foreground bg-foreground/[0.04]" : "hover:border-foreground/40")}>
              <input type="radio" value="CASH" className="mt-1 accent-[var(--primary)]" {...register("paymentMethod")} />
              <span>
                <span className="flex items-center gap-2 text-[14px] font-medium"><Banknote className="size-4" /> {delivery ? "Cash on delivery" : "Pay at pickup"}</span>
                <span className="mt-1 block text-[12.5px] font-light text-muted-foreground">Pay when your order {delivery ? "arrives" : "is collected"}.</span>
              </span>
            </label>

            {/* CLIQ Option */}
            <label className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors", paymentMethod === "CLIQ" ? "border-foreground bg-foreground/[0.04]" : "hover:border-foreground/40")}>
              <input type="radio" value="CLIQ" className="mt-1 accent-[var(--primary)]" {...register("paymentMethod")} />
              <span>
                <span className="flex items-center gap-2 text-[14px] font-medium"><CreditCard className="size-4" /> Cliq Transfer</span>
                <span className="mt-1 block text-[12.5px] font-light text-muted-foreground">Send payment to Alias: LUMIERE.</span>
              </span>
            </label>

          </div>
          {errors.paymentMethod && <p role="alert" className="text-xs text-destructive">{errors.paymentMethod.message}</p>}
        </fieldset>
      </div>

      <aside aria-label="Order summary" className="space-y-6 border bg-card p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-[26px]">Your order</h2>
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3 text-[13px]">
              <ProductImage src={l.imageUrl} alt={l.name} className="size-12 shrink-0 rounded" sizes="48px" />
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{l.quantity} × {l.name}</span>{l.options.length > 0 && <span className="block truncate text-xs font-light text-muted-foreground">{l.options.map((o) => o.name).join(", ")}</span>}</span>
              <span className="tabular">{money(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-5"><QuoteSummary q={quote} loading={isFetching} delivery={delivery} /></div>
        {quote?.coupon && <p className="text-[12.5px] text-muted-foreground">Promo code <span className="font-mono">{quote.coupon.code}</span> applied.</p>}
        {(blocking.length > 0 || (delivery && !zoneId)) && (
          <ul role="alert" className="space-y-1.5 rounded-md bg-destructive/8 p-3 text-[12.5px] text-destructive">{blocking.map((i) => <li key={i}>{i}</li>)}{delivery && !zoneId && !blocking.length && <li>Choose your delivery area.</li>}</ul>
        )}
        <button type="submit" disabled={place.isPending || !quote || blocking.length > 0} className="flex w-full items-center justify-between bg-primary px-6 py-4 text-[11px] uppercase tracking-[0.15em] text-primary-foreground transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
          <span className="inline-flex items-center gap-2">{place.isPending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-3.5" />} Place order</span>
          {quote && <span className="tabular font-sans text-[13px] tracking-normal">{money(quote.total)}</span>}
        </button>
        <p className="text-center text-[11.5px] font-light text-muted-foreground">You'll get a live tracking link as soon as you order.</p>
      </aside>
    </form>
  );
}