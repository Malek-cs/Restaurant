"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { adminCreateOrderSchema } from "@/lib/validation/order";
import { api } from "@/lib/api/client";
import { effectivePrice } from "@/lib/pricing";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useDebounce } from "@/hooks/use-debounce";
import type { ProductList, QuoteResult, ProductRow } from "@/types/api";
import { FormSurface } from "@/components/shared/form-surface";
import { Field, applyServerErrors } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

type Values = z.input<typeof adminCreateOrderSchema>;
type Line = Values["items"][number] & { name: string; unit: number; optionNames: string[] };

function PickerRow({ p, onAdd }: { p: ProductRow; onAdd: (line: Line) => void }) {
  const { money } = useFormat();
  const options = p.options.filter((o) => o.isActive);
  const sizes = options.filter((o) => o.type === "SIZE");
  const addons = options.filter((o) => o.type === "ADDON");
  const [size, setSize] = useState(sizes.find((s) => s.isDefault)?.id ?? sizes[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const chosen = [...(size ? [sizes.find((s) => s.id === size)!] : []), ...addons.filter((a) => picked.includes(a.id))];
  const unit = effectivePrice(p) + chosen.reduce((s, o) => s + o.priceDelta, 0);

  return (
    <li className="space-y-2 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.category.name} · {money(unit)}</p></div>
        <Button type="button" size="sm" variant="outline" disabled={!p.isAvailable} onClick={() => onAdd({ productId: p.id, quantity: 1, optionIds: chosen.map((o) => o.id), name: p.name, unit, optionNames: chosen.map((o) => o.name) })}><Plus /> Add</Button>
      </div>
      {(sizes.length > 0 || addons.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 ps-0.5">
          {sizes.length > 0 && (
            <Select aria-label={`Size for ${p.name}`} value={size} onChange={(e) => setSize(e.target.value)} className="h-8 w-auto text-xs">
              {sizes.map((s) => <option key={s.id} value={s.id}>{s.name}{s.priceDelta ? ` (+${money(s.priceDelta)})` : ""}</option>)}
            </Select>
          )}
          {addons.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={picked.includes(a.id)} onChange={(e) => setPicked((c) => (e.target.checked ? [...c, a.id] : c.filter((x) => x !== a.id)))} className="accent-[var(--primary)]" />
              {a.name} (+{money(a.priceDelta)})
            </label>
          ))}
        </div>
      )}
    </li>
  );
}

export function NewOrderDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { money } = useFormat();
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search, 250);

  const form = useForm<Values>({
    resolver: zodResolver(adminCreateOrderSchema),
    defaultValues: { type: "PICKUP", customer: { name: "", phone: "", email: "" }, paymentMethod: "CASH", markPaid: false, items: [], couponCode: "", notes: "", addressLine: "", building: "", floor: "", apartment: "", deliveryNotes: "" },
  });
  const { register, control, watch, formState: { errors, isDirty } } = form;
  const type = watch("type");
  const zoneId = watch("zoneId");
  const couponCode = watch("couponCode");
  const phone = watch("customer.phone");

  const products = useApiQuery<ProductList>("/api/admin/products", { pageSize: 100, q: dSearch, sort: "name", dir: "asc" }, { placeholderData: (p) => p });
  const zones = useApiQuery<{ id: string; name: string; fee: number; isActive: boolean }[]>("/api/admin/delivery-zones", undefined, { enabled: type === "DELIVERY" });
  const dCoupon = useDebounce(couponCode ?? "", 500);

  const quoteInput = useMemo(
    () => ({ type, zoneId: type === "DELIVERY" ? zoneId || undefined : undefined, couponCode: dCoupon || undefined, phone: phone || undefined, items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds })) }),
    [type, zoneId, dCoupon, phone, lines],
  );
  const quote = useQuery<QuoteResult>({
    queryKey: ["admin-order-quote", quoteInput],
    queryFn: () => api.post<QuoteResult>("/api/admin/orders/quote", quoteInput),
    enabled: lines.length > 0 && (type !== "DELIVERY" || !!zoneId),
    placeholderData: (p) => p,
  });

  const create = useApiMutation((v: Values) => api.post<{ id: string; number: number }>("/api/admin/orders", v), {
    invalidate: ["/api/admin/orders", "/api/admin/analytics"],
    success: (r) => `Order #${r.number} created.`,
    onSuccess: (r) => onCreated(r.id),
    onError: (e) => applyServerErrors(form, e),
  });

  const setItems = (next: Line[]) => {
    setLines(next);
    form.setValue("items", next.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds })), { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
  };
  const addLine = (line: Line) => {
    const key = (l: Line) => l.productId + [...(l.optionIds ?? [])].sort().join(",");
    const existing = lines.find((l) => key(l) === key(line));
    setItems(existing ? lines.map((l) => (l === existing ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l)) : [...lines, line]);
  };

  const q = quote.data;
  const problem = q?.issues?.[0] ?? q?.couponError;

  return (
    <FormSurface
      open={open}
      onClose={onClose}
      variant="sheet"
      sheetWidth="max-w-2xl"
      title="New order"
      description="Take a phone, walk-in or dine-in order. It's confirmed straight away."
      dirty={isDirty || lines.length > 0}
      submitting={create.isPending}
      submitLabel={q ? `Create order · ${money(q.total)}` : "Create order"}
      onSubmit={form.handleSubmit((v) => create.mutate(v))}
    >
      <div className="space-y-7">
        <section aria-labelledby="no-items" className="space-y-3">
          <h3 id="no-items" className="text-sm font-semibold">1. Items</h3>
          <div className="relative"><Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the menu…" className="ps-9" aria-label="Search the menu" /></div>
          <ul className="scrollbar-thin max-h-56 divide-y overflow-y-auto rounded-lg border">
            {products.isLoading ? Array.from({ length: 4 }).map((_, i) => <li key={i} className="p-3"><Skeleton className="h-8" /></li>) : products.data?.rows.length ? products.data.rows.map((p) => <PickerRow key={p.id} p={p} onAdd={addLine} />) : <li className="p-6 text-center text-[13px] text-muted-foreground">No dishes found.</li>}
          </ul>
          {errors.items && <p role="alert" className="text-xs text-destructive">{errors.items.message ?? errors.items.root?.message}</p>}
          {lines.length > 0 && (
            <ul className="divide-y rounded-lg border bg-muted/30">
              {lines.map((l, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{l.name}</p>{l.optionNames.length > 0 && <p className="truncate text-xs text-muted-foreground">{l.optionNames.join(" · ")}</p>}</div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon-sm" variant="outline" aria-label="Decrease quantity" onClick={() => setItems(l.quantity <= 1 ? lines.filter((_, j) => j !== i) : lines.map((x, j) => (j === i ? { ...x, quantity: x.quantity - 1 } : x)))}><Minus /></Button>
                    <span className="tabular w-7 text-center text-[13px]">{l.quantity}</span>
                    <Button type="button" size="icon-sm" variant="outline" aria-label="Increase quantity" onClick={() => setItems(lines.map((x, j) => (j === i ? { ...x, quantity: Math.min(50, x.quantity + 1) } : x)))}><Plus /></Button>
                  </div>
                  <span className="tabular w-20 text-end text-[13px]">{money(l.unit * l.quantity)}</span>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove ${l.name}`} onClick={() => setItems(lines.filter((_, j) => j !== i))}><Trash2 /></Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="no-cust">
          <h3 id="no-cust" className="text-sm font-semibold">2. Customer</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="c-name" required error={errors.customer?.name?.message}><Input id="c-name" autoComplete="off" aria-invalid={!!errors.customer?.name} {...register("customer.name")} /></Field>
            <Field label="Phone" htmlFor="c-phone" required error={errors.customer?.phone?.message} hint="Local numbers default to +962"><Input id="c-phone" inputMode="tel" autoComplete="off" placeholder="079 000 0000" aria-invalid={!!errors.customer?.phone} {...register("customer.phone")} /></Field>
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="no-ful">
          <h3 id="no-ful" className="text-sm font-semibold">3. Fulfilment</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Order type" htmlFor="o-type"><Select id="o-type" {...register("type")}><option value="DINE_IN">Dine-in</option><option value="PICKUP">Pickup</option><option value="DELIVERY">Delivery</option></Select></Field>
            {type === "DELIVERY" && (
              <Field label="Delivery area" htmlFor="o-zone" required error={errors.zoneId?.message}>
                <Select id="o-zone" aria-invalid={!!errors.zoneId} {...register("zoneId")}><option value="">Choose area…</option>{zones.data?.filter((z) => z.isActive).map((z) => <option key={z.id} value={z.id}>{z.name} · {money(z.fee)}</option>)}</Select>
              </Field>
            )}
          </div>
          {type === "DELIVERY" && (
            <>
              <Field label="Street address" htmlFor="o-addr" required error={errors.addressLine?.message}><Input id="o-addr" aria-invalid={!!errors.addressLine} {...register("addressLine")} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Building" htmlFor="o-b"><Input id="o-b" {...register("building")} /></Field>
                <Field label="Floor" htmlFor="o-f"><Input id="o-f" {...register("floor")} /></Field>
                <Field label="Apartment" htmlFor="o-a"><Input id="o-a" {...register("apartment")} /></Field>
              </div>
            </>
          )}
          <Field label="Order notes" htmlFor="o-notes"><Textarea id="o-notes" rows={2} placeholder="Allergies, special requests…" {...register("notes")} /></Field>
        </section>

        <section className="space-y-3" aria-labelledby="no-pay">
          <h3 id="no-pay" className="text-sm font-semibold">4. Payment</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Method" htmlFor="o-method"><Select id="o-method" {...register("paymentMethod")}><option value="CASH">Cash</option><option value="ONLINE">Card / online</option></Select></Field>
            <Field label="Coupon code" htmlFor="o-coupon" error={errors.couponCode?.message ?? q?.couponError ?? undefined}><Input id="o-coupon" autoComplete="off" className="uppercase" {...register("couponCode")} /></Field>
          </div>
          <Controller control={control} name="markPaid" render={({ field }) => (
            <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
              <span><span className="block text-[13px] font-medium">Payment received now</span><span className="block text-xs text-muted-foreground">Turn on if the customer has already paid.</span></span>
              <Switch checked={!!field.value} onCheckedChange={field.onChange} aria-label="Payment received now" />
            </label>
          )} />
        </section>

        {q && lines.length > 0 && (
          <section aria-label="Order summary" className="space-y-1.5 rounded-lg bg-muted/50 p-4 text-[13px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular">{money(q.subtotal)}</span></div>
            {q.discountTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount ({q.coupon?.code})</span><span className="tabular">−{money(q.discountTotal)}</span></div>}
            {q.deliveryFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="tabular">{money(q.deliveryFee)}</span></div>}
            {q.serviceFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span className="tabular">{money(q.serviceFee)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({q.taxRate}%)</span><span className="tabular">{money(q.taxTotal)}</span></div>
            <div className="flex justify-between border-t pt-2 text-sm font-semibold"><span>Total</span><span className="tabular">{money(q.total)}</span></div>
            {problem && <p role="alert" className="pt-1 text-xs text-destructive">{problem}</p>}
          </section>
        )}
      </div>
    </FormSurface>
  );
}
