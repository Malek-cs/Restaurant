"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Bike, MapPin, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { zoneSchema } from "@/lib/validation/admin";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import type { ZoneRow } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormSurface } from "@/components/shared/form-surface";
import { Field, applyServerErrors } from "@/components/shared/field";
import { MoneyInput } from "@/components/shared/money-input";
import { useConfirm } from "@/components/shared/confirm-dialog";

type Values = z.input<typeof zoneSchema>;

function ZoneForm({ zone, onClose }: { zone: ZoneRow | null; onClose: () => void }) {
  const form = useForm<Values>({ resolver: zodResolver(zoneSchema), defaultValues: { name: zone?.name ?? "", description: zone?.description ?? "", fee: zone?.fee ?? 1500, minOrder: zone?.minOrder ?? 8000, etaMinutes: zone?.etaMinutes ?? 40, isActive: zone?.isActive ?? true } });
  const { register, control, formState: { errors, isDirty } } = form;
  const save = useApiMutation((v: Values) => (zone ? api.put(`/api/admin/delivery-zones/${zone.id}`, v) : api.post("/api/admin/delivery-zones", v)), {
    invalidate: ["/api/admin/delivery-zones"], success: zone ? "Zone updated." : "Zone added.", onSuccess: onClose, onError: (e) => applyServerErrors(form, e),
  });
  return (
    <FormSurface open onClose={onClose} title={zone ? `Edit ${zone.name}` : "New delivery zone"} description="Guests pick a zone at checkout to see their fee and minimum order." dirty={isDirty} submitting={save.isPending} onSubmit={form.handleSubmit((v) => save.mutate(v))}>
      <div className="space-y-4">
        <Field label="Zone name" htmlFor="z-name" required error={errors.name?.message}><Input id="z-name" autoFocus placeholder="e.g. Abdoun" aria-invalid={!!errors.name} {...register("name")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Delivery fee" htmlFor="z-fee" error={errors.fee?.message}><Controller control={control} name="fee" render={({ field }) => <MoneyInput id="z-fee" value={field.value} onChange={(v) => field.onChange(v ?? 0)} invalid={!!errors.fee} />} /></Field>
          <Field label="Minimum order" htmlFor="z-min" error={errors.minOrder?.message}><Controller control={control} name="minOrder" render={({ field }) => <MoneyInput id="z-min" value={field.value} onChange={(v) => field.onChange(v ?? 0)} invalid={!!errors.minOrder} />} /></Field>
        </div>
        <Field label="Estimated delivery time (minutes)" htmlFor="z-eta" error={errors.etaMinutes?.message}><Input id="z-eta" type="number" min={5} inputMode="numeric" className="tabular" aria-invalid={!!errors.etaMinutes} {...register("etaMinutes", { valueAsNumber: true })} /></Field>
        <Field label="Notes" htmlFor="z-desc" hint="Internal — e.g. streets or neighbourhoods included"><Textarea id="z-desc" rows={2} {...register("description")} /></Field>
        <Controller control={control} name="isActive" render={({ field }) => <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5"><span><span className="block text-[13px] font-medium">Active</span><span className="block text-xs text-muted-foreground">Inactive zones can't be chosen at checkout.</span></span><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Active" /></label>} />
      </div>
    </FormSurface>
  );
}

export function DeliveryView({ canManage }: { canManage: boolean }) {
  const { money } = useFormat();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<ZoneRow | "new" | null>(null);
  const { data, isLoading, error, refetch } = useApiQuery<ZoneRow[]>("/api/admin/delivery-zones");
  const inv = ["/api/admin/delivery-zones"];
  const toggle = useApiMutation((z: ZoneRow) => api.put(`/api/admin/delivery-zones/${z.id}`, { name: z.name, description: z.description, fee: z.fee, minOrder: z.minOrder, etaMinutes: z.etaMinutes, isActive: !z.isActive }), { invalidate: inv });
  const remove = useApiMutation((id: string) => api.del(`/api/admin/delivery-zones/${id}`), { invalidate: inv, success: "Zone deleted." });

  async function onDelete(z: ZoneRow) {
    const r = await confirm({ title: `Delete “${z.name}”?`, description: z.orderCount ? `${z.orderCount} past orders used this zone. They keep the zone name, but guests won't be able to choose it any more.` : "Guests won't be able to choose it at checkout.", confirmLabel: "Delete zone", destructive: true });
    if (r.confirmed) remove.mutate(z.id);
  }

  const actions = (z: ZoneRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${z.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent><DropdownMenuItem onSelect={() => setEditing(z)}><Pencil /> Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem destructive onSelect={() => onDelete(z)}><Trash2 /> Delete</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: Column<ZoneRow>[] = [
    { key: "name", header: "Zone", mobile: "title", cell: (z) => <div className="flex items-center gap-2.5"><MapPin className="size-4 text-muted-foreground" /><span className="font-medium">{z.name}</span></div> },
    { key: "fee", header: "Fee", align: "end", cell: (z) => <span className="tabular">{money(z.fee)}</span> },
    { key: "min", header: "Minimum order", align: "end", cell: (z) => <span className="tabular">{money(z.minOrder)}</span> },
    { key: "eta", header: "Est. time", align: "end", cell: (z) => <span className="tabular">{z.etaMinutes} min</span> },
    { key: "orders", header: "Orders", align: "end", cell: (z) => <span className="tabular text-muted-foreground">{z.orderCount}</span>, mobile: "hide" },
    { key: "active", header: "Active", cell: (z) => canManage ? <Switch checked={z.isActive} onCheckedChange={() => toggle.mutate(z)} aria-label={`${z.name} active`} /> : (z.isActive ? "Yes" : "No") },
    ...(canManage ? [{ key: "actions", header: <span className="sr-only">Actions</span>, align: "end" as const, mobile: "action" as const, cell: actions }] : []),
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Delivery" description="Zones, fees, minimums and delivery times — all editable, none hard-coded." actions={canManage && <Button onClick={() => setEditing("new")}><Plus /> New zone</Button>} />
      <Card>
        <DataTable columns={columns} rows={data} rowKey={(z) => z.id} loading={isLoading} error={error?.message} onRetry={() => refetch()} onRowClick={canManage ? (z) => setEditing(z) : undefined}
          empty={{ icon: Bike, title: "No delivery zones", description: "Add the areas you deliver to. Without an active zone, guests can only order pickup.", action: canManage ? <Button onClick={() => setEditing("new")}><Plus /> New zone</Button> : undefined }} />
      </Card>
      <CardContent className="px-1 pt-4 text-xs text-muted-foreground">Delivery on/off, pickup on/off and the restaurant-wide minimum order live in Settings → Business.</CardContent>
      {editing && <ZoneForm key={editing === "new" ? "new" : editing.id} zone={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
