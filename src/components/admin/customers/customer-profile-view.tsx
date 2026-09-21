"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import type { CustomerProfile } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/empty-state";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { StarRating } from "@/components/shared/star-rating";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes";
import { whatsappLink } from "@/utils/phone";
import { initials, timeAgo } from "@/utils/format";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <Card className="p-4"><p className="text-[13px] text-muted-foreground">{label}</p><p className="font-display tabular mt-1.5 text-[28px] font-medium leading-none">{value}</p></Card>;
}

export function CustomerProfileView({ id, canEdit, canOpenOrders }: { id: string; canEdit: boolean; canOpenOrders: boolean }) {
  const { money, date, dateTime } = useFormat();
  const { data, isLoading, error, refetch } = useApiQuery<CustomerProfile>(`/api/admin/customers/${id}`);
  const [notes, setNotes] = useState("");
  useEffect(() => { if (data) setNotes(data.customer.notes ?? ""); }, [data]);
  const dirty = !!data && notes !== (data.customer.notes ?? "");
  useUnsavedChangesWarning(dirty);
  const save = useApiMutation((n: string) => api.patch(`/api/admin/customers/${id}`, { notes: n }), { invalidate: [`/api/admin/customers`], success: "Notes saved." });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-72" /><div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-80" /></div>;
  if (error || !data) return <Card><ErrorState message={error?.message ?? "Customer not found."} onRetry={() => refetch()} /></Card>;
  const { customer: c, stats, favorites, orders } = data;

  return (
    <div className="animate-fade-in">
      <Link href="/admin/customers" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4 rtl:rotate-180" /> All customers</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">{initials(c.name)}</span>
          <div><h1 className="font-display text-[34px] font-medium leading-none tracking-tight">{c.name}</h1><p className="mt-1.5 text-[13px] text-muted-foreground">Customer since {date(c.createdAt)}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><a href={`tel:${c.phone}`}><Phone /> {c.phone}</a></Button>
          <Button asChild variant="outline"><a href={whatsappLink(c.phone)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button>
          {c.email && <Button asChild variant="outline"><a href={`mailto:${c.email}`}><Mail /> Email</a></Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={stats.orders} />
        <Stat label="Total spent" value={money(stats.spent, { compact: true })} />
        <Stat label="Average order" value={money(stats.averageOrder)} />
        <Stat label="Last order" value={stats.lastOrderAt ? timeAgo(stats.lastOrderAt) : "—"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Order history</CardTitle></CardHeader>
          <CardContent className="pt-3">
            {orders.length === 0 ? <p className="py-8 text-center text-[13px] text-muted-foreground">No orders yet.</p> : (
              <ul className="divide-y">
                {orders.map((o) => {
                  const inner = (
                    <>
                      <span className="tabular w-14 shrink-0 text-[13px] font-medium">#{o.number}</span>
                      <span className="min-w-0 flex-1 text-[13px]"><span className="block">{dateTime(o.placedAt)}</span><span className="block text-xs text-muted-foreground">{o._count.items} items · {o.type.toLowerCase().replace("_", "-")}</span></span>
                      <span className="tabular hidden text-[13px] sm:block">{money(o.total)}</span>
                      <span className="hidden md:block">{o.payment && <PaymentStatusBadge status={o.payment.status} />}</span>
                      <OrderStatusBadge status={o.status} />
                    </>
                  );
                  return <li key={o.id}>{canOpenOrders ? <Link href={`/admin/orders/${o.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-accent/50">{inner}</Link> : <div className="flex items-center gap-3 py-3">{inner}</div>}</li>;
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Favourite dishes</CardTitle></CardHeader>
            <CardContent className="pt-3">
              {favorites.length === 0 ? <p className="text-[13px] text-muted-foreground">Nothing ordered yet.</p> : (
                <ol className="space-y-2.5">{favorites.map((f, i) => <li key={f.name} className="flex items-center gap-3 text-[13px]"><span className="tabular w-4 text-muted-foreground">{i + 1}</span><span className="min-w-0 flex-1 truncate">{f.name}</span><span className="tabular text-muted-foreground">{f.quantity}×</span></li>)}</ol>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent className="pt-3">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} readOnly={!canEdit} placeholder={canEdit ? "Allergies, preferences, anything the team should remember…" : "No notes"} aria-label="Customer notes" />
              {canEdit && <div className="mt-3 flex justify-end gap-2">{dirty && <Button variant="ghost" size="sm" onClick={() => setNotes(c.notes ?? "")}>Reset</Button>}<Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(notes)}>Save notes</Button></div>}
            </CardContent>
          </Card>
          {data.customer.reviews.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Reviews</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-3">{data.customer.reviews.map((r) => <div key={r.id} className="text-[13px]"><div className="flex items-center gap-2"><StarRating value={r.rating} size={13} /><span className="text-xs text-muted-foreground">{date(r.createdAt)}</span></div>{r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}</div>)}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
