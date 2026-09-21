"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Plus, TicketPercent, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { couponSchema, type CouponFormValues } from "@/lib/validation/admin";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import type { CouponRow } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormSurface } from "@/components/shared/form-surface";
import { Field, applyServerErrors } from "@/components/shared/field";
import { MoneyInput } from "@/components/shared/money-input";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { formatInTimeZone } from "date-fns-tz";

const statusTone: Record<string, Tone> = { ACTIVE: "green", INACTIVE: "gray", SCHEDULED: "blue", EXPIRED: "red", EXHAUSTED: "orange" };

function CouponForm({ coupon, onClose }: { coupon: CouponRow | null; onClose: () => void }) {
  const { restaurant } = useFormat();
  const day = (d: string | null) => (d ? formatInTimeZone(new Date(d), restaurant.timezone, "yyyy-MM-dd") : "");
  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: { code: coupon?.code ?? "", description: coupon?.description ?? "", type: coupon?.type ?? "PERCENT", value: coupon?.value ?? 10, minOrder: coupon?.minOrder ?? 0, maxDiscount: coupon?.maxDiscount ?? null, startsAt: day(coupon?.startsAt ?? null), expiresAt: day(coupon?.expiresAt ?? null), usageLimit: coupon?.usageLimit ?? null, perCustomerLimit: coupon?.perCustomerLimit ?? null, isActive: coupon?.isActive ?? true, isPublic: coupon?.isPublic ?? false },
  });
  const { register, control, watch, formState: { errors, isDirty } } = form;
  const type = watch("type");
  const save = useApiMutation((v: CouponFormValues) => (coupon ? api.put(`/api/admin/coupons/${coupon.id}`, v) : api.post("/api/admin/coupons", v)), {
    invalidate: ["/api/admin/coupons"], success: coupon ? "Coupon updated." : "Coupon created.", onSuccess: onClose, onError: (e) => applyServerErrors(form, e),
  });
  const intField = (name: "usageLimit" | "perCustomerLimit") => register(name, { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) });

  return (
    <FormSurface open onClose={onClose} title={coupon ? `Edit ${coupon.code}` : "New coupon"} dirty={isDirty} submitting={save.isPending} onSubmit={form.handleSubmit((v) => save.mutate(v))}>
      <div className="space-y-4">
        <Field label="Code" htmlFor="cp-code" required error={errors.code?.message} hint="Guests type this at checkout. Letters, numbers, - and _"><Input id="cp-code" autoFocus className="uppercase tracking-wide" aria-invalid={!!errors.code} {...register("code", { setValueAs: (v) => String(v ?? "").toUpperCase() })} /></Field>
        <Field label="Description" htmlFor="cp-desc" error={errors.description?.message} hint="Shown on the website when public"><Input id="cp-desc" {...register("description")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount type" htmlFor="cp-type"><Select id="cp-type" {...register("type")}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></Select></Field>
          <Field label={type === "PERCENT" ? "Percent off" : "Amount off"} htmlFor="cp-val" required error={errors.value?.message}>
            {type === "PERCENT" ? <div className="relative"><Input id="cp-val" type="number" min={1} max={100} inputMode="numeric" className="tabular pe-8" aria-invalid={!!errors.value} {...register("value", { valueAsNumber: true })} /><span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div>
              : <Controller control={control} name="value" render={({ field }) => <MoneyInput id="cp-val" value={field.value} onChange={(v) => field.onChange(v ?? 0)} invalid={!!errors.value} />} />}
          </Field>
          <Field label="Minimum order" htmlFor="cp-min" error={errors.minOrder?.message}><Controller control={control} name="minOrder" render={({ field }) => <MoneyInput id="cp-min" value={field.value} onChange={(v) => field.onChange(v ?? 0)} />} /></Field>
          {type === "PERCENT" && <Field label="Max discount" htmlFor="cp-max" hint="Optional cap"><Controller control={control} name="maxDiscount" render={({ field }) => <MoneyInput id="cp-max" value={field.value} onChange={field.onChange} />} /></Field>}
          <Field label="Starts" htmlFor="cp-start" error={errors.startsAt?.message}><Input id="cp-start" type="date" {...register("startsAt")} /></Field>
          <Field label="Expires" htmlFor="cp-exp" error={errors.expiresAt?.message} hint="Valid through the end of this day"><Input id="cp-exp" type="date" {...register("expiresAt")} /></Field>
          <Field label="Total usage limit" htmlFor="cp-use" hint="Blank = unlimited"><Input id="cp-use" type="number" min={1} inputMode="numeric" className="tabular" {...intField("usageLimit")} /></Field>
          <Field label="Per-customer limit" htmlFor="cp-per" hint="Blank = unlimited"><Input id="cp-per" type="number" min={1} inputMode="numeric" className="tabular" {...intField("perCustomerLimit")} /></Field>
        </div>
        <Controller control={control} name="isActive" render={({ field }) => <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5"><span><span className="block text-[13px] font-medium">Active</span><span className="block text-xs text-muted-foreground">Inactive codes are rejected at checkout.</span></span><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Active" /></label>} />
        <Controller control={control} name="isPublic" render={({ field }) => <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5"><span><span className="block text-[13px] font-medium">Show as public offer</span><span className="block text-xs text-muted-foreground">Displays the code in “Special offers” on the homepage.</span></span><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Show as public offer" /></label>} />
      </div>
    </FormSurface>
  );
}

export function DiscountsView() {
  const router = useRouter();
  const sp = useSearchParams();
  const { money, date } = useFormat();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<CouponRow | "new" | null>(null);
  useEffect(() => { if (sp.get("new") === "1") { setEditing("new"); router.replace("/admin/discounts"); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, isLoading, error, refetch } = useApiQuery<CouponRow[]>("/api/admin/coupons");
  const remove = useApiMutation((id: string) => api.del(`/api/admin/coupons/${id}`), { invalidate: ["/api/admin/coupons"], success: "Coupon deleted." });
  const toggle = useApiMutation((c: CouponRow) => api.put(`/api/admin/coupons/${c.id}`, { code: c.code, description: c.description, type: c.type, value: c.value, minOrder: c.minOrder, maxDiscount: c.maxDiscount, startsAt: c.startsAt ? c.startsAt.slice(0, 10) : "", expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "", usageLimit: c.usageLimit, perCustomerLimit: c.perCustomerLimit, isActive: !c.isActive, isPublic: c.isPublic }), { invalidate: ["/api/admin/coupons"] });

  async function onDelete(c: CouponRow) {
    const r = await confirm({ title: `Delete ${c.code}?`, description: "Past orders keep the code for their records. It stops working immediately.", confirmLabel: "Delete coupon", destructive: true });
    if (r.confirmed) remove.mutate(c.id);
  }

  const actions = (c: CouponRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.code}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => setEditing(c)}><Pencil /> Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onDelete(c)}><Trash2 /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: Column<CouponRow>[] = [
    { key: "code", header: "Code", mobile: "title", cell: (c) => <div><p className="font-mono text-[13px] font-semibold tracking-wide">{c.code}</p>{c.description && <p className="max-w-[16rem] truncate text-xs text-muted-foreground">{c.description}</p>}</div> },
    { key: "value", header: "Discount", cell: (c) => <span className="tabular font-medium">{c.type === "PERCENT" ? `${c.value}%` : money(c.value)}{c.maxDiscount ? <span className="text-xs font-normal text-muted-foreground"> (max {money(c.maxDiscount)})</span> : null}</span> },
    { key: "min", header: "Min order", align: "end", cell: (c) => <span className="tabular">{c.minOrder ? money(c.minOrder) : "—"}</span> },
    { key: "usage", header: "Used", align: "end", cell: (c) => <span className="tabular">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</span> },
    { key: "expires", header: "Valid until", cell: (c) => (c.expiresAt ? date(c.expiresAt) : <span className="text-muted-foreground">No expiry</span>) },
    { key: "status", header: "Status", cell: (c) => <div className="flex flex-wrap gap-1"><Badge tone={statusTone[c.status]} dot>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</Badge>{c.isPublic && <Badge tone="olive">Public</Badge>}</div> },
    { key: "active", header: "Active", mobile: "hide", cell: (c) => <Switch checked={c.isActive} onCheckedChange={() => toggle.mutate(c)} aria-label={`${c.code} active`} /> },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "end", mobile: "action", cell: actions },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Discounts" description="Coupon codes and public offers. Discounts apply to the food subtotal, never to delivery." actions={<Button onClick={() => setEditing("new")}><Plus /> New coupon</Button>} />
      <Card>
        <DataTable columns={columns} rows={data} rowKey={(c) => c.id} loading={isLoading} error={error?.message} onRetry={() => refetch()} onRowClick={(c) => setEditing(c)}
          empty={{ icon: TicketPercent, title: "No coupons yet", description: "Create a welcome offer to bring guests back.", action: <Button onClick={() => setEditing("new")}><Plus /> New coupon</Button> }} />
      </Card>
      {editing && <CouponForm key={editing === "new" ? "new" : editing.id} coupon={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
