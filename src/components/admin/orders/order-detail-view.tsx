"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bike, Check, ExternalLink, MapPin, MessageCircle, Phone, Printer, User2, Wallet, Clock, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import type { OrderDetail } from "@/types/api";
import { actionLabel, nextStatuses, permissionsForTransition, STATUS_META, type OrderStatus } from "@/lib/order-status";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { TEMPLATE_DEFAULTS } from "@/lib/whatsapp/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/shared/empty-state";
import { OrderStatusBadge, OrderTypeBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { Field } from "@/components/shared/field";
import { whatsappLink } from "@/utils/phone";
import { timeAgo } from "@/utils/format";
import { cn } from "@/lib/utils";

const ORDER_MESSAGES = ["ORDER_CONFIRMED", "ORDER_READY", "OUT_FOR_DELIVERY", "ORDER_COMPLETED"] as const;

function InfoRow({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <li className="flex items-start gap-2.5 text-[13px]"><Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1">{children}</div></li>;
}

function AssignDriverDialog({ orderId, current, onClose }: { orderId: string; current: string | null; onClose: () => void }) {
  const drivers = useApiQuery<{ id: string; name: string }[]>("/api/admin/drivers");
  const [driverId, setDriverId] = useState(current ?? "");
  const save = useApiMutation((id: string | null) => api.put(`/api/admin/orders/${orderId}/driver`, { driverId: id }), {
    invalidate: ["/api/admin/orders"], success: "Driver updated.", onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>Assign delivery driver</DialogTitle><DialogDescription>The driver will see this order in their queue.</DialogDescription></DialogHeader>
        <DialogBody>
          <Field label="Driver" htmlFor="driver">
            <Select id="driver" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">{drivers.isLoading ? "Loading…" : "Choose a driver…"}</option>
              {drivers.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        </DialogBody>
        <DialogFooter>
          {current && <Button variant="ghost" className="me-auto" onClick={() => save.mutate(null)} disabled={save.isPending}>Unassign</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate(driverId)} disabled={!driverId} loading={save.isPending}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrderDetailView({ id, permissions, roleKey }: { id: string; permissions: Permission[]; roleKey: string }) {
  const { money, dateTime } = useFormat();
  const confirm = useConfirm();
  const [assigning, setAssigning] = useState(false);
  const { data: o, isLoading, error, refetch } = useApiQuery<OrderDetail>(`/api/admin/orders/${id}`, undefined, { refetchInterval: 15_000 });

  const can = (p: Permission | Permission[]) => hasPermission(permissions, p);
  const inv = ["/api/admin/orders", "/api/admin/payments", "/api/admin/analytics"];

  const transition = useApiMutation((v: { status: OrderStatus; note?: string }) => api.post(`/api/admin/orders/${id}/status`, v), {
    invalidate: inv,
    success: (_, v) => (v.status === "CANCELLED" ? "Order cancelled." : `Order marked ${STATUS_META[v.status].label.toLowerCase()}.`),
  });
  const payment = useApiMutation((v: { paymentId: string; status: string }) => api.patch(`/api/admin/payments/${v.paymentId}`, { status: v.status }), { invalidate: inv, success: "Payment updated." });
  const send = useApiMutation((key: string) => api.post<{ id: string; link: string }>("/api/admin/whatsapp/send", { templateKey: key, orderId: id }), {
    invalidate: inv,
    onSuccess: (r) => { window.open(r.link, "_blank", "noopener"); toast.success("WhatsApp opened with your message."); },
  });
  const markSent = useApiMutation((v: { id: string; link: string }) => api.post(`/api/admin/whatsapp/logs/${v.id}/sent`).then(() => v.link), {
    invalidate: inv, onSuccess: (link) => window.open(link, "_blank", "noopener"),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 lg:col-span-2" /><Skeleton className="h-96" /></div></div>;
  if (error || !o) return <Card><ErrorState message={error?.message ?? "Order not found."} onRetry={() => refetch()} /></Card>;

  const status = o.status as OrderStatus;
  const transitions = nextStatuses({ status, type: o.type as "DELIVERY" | "PICKUP" | "DINE_IN" }).filter((to) => can(permissionsForTransition(status, to)));
  const forward = transitions.filter((t) => t !== "CANCELLED");
  const cancel = transitions.find((t) => t === "CANCELLED");
  const needsDriver = o.type === "DELIVERY" && !o.driver && status !== "COMPLETED" && status !== "CANCELLED";

  async function run(to: OrderStatus) {
    if (to === "CANCELLED") {
      const r = await confirm({
        title: status === "NEW" ? `Reject order #${o!.number}?` : `Cancel order #${o!.number}?`,
        description: "The customer will see this order as cancelled. Stock is restored and paid online orders are marked refunded.",
        confirmLabel: status === "NEW" ? "Reject order" : "Cancel order",
        cancelLabel: "Keep order",
        destructive: true,
        reason: { label: "Reason", required: status !== "NEW", placeholder: "e.g. Item unavailable, customer requested" },
      });
      if (!r.confirmed) return;
      transition.mutate({ status: to, note: r.reason });
      return;
    }
    transition.mutate({ status: to });
  }

  async function refund(p: NonNullable<OrderDetail["payment"]>) {
    const r = await confirm({ title: "Mark payment as refunded?", description: "This records the refund in Lumière. Return the money through your payment provider or in cash.", confirmLabel: "Mark refunded", destructive: true });
    if (r.confirmed) payment.mutate({ paymentId: p.id, status: "REFUNDED" });
  }

  const p = o.payment;
  const address = [o.addressLine, o.building && `Bldg ${o.building}`, o.floor && `Floor ${o.floor}`, o.apartment && `Apt ${o.apartment}`].filter(Boolean).join(", ");
  const queued = o.messages.filter((m) => m.status === "QUEUED" && m.link);

  return (
    <div className="animate-fade-in">
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4 rtl:rotate-180" /> All orders</Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display tabular text-[36px] font-medium leading-none tracking-tight">Order #{o.number}</h1>
            <OrderStatusBadge status={o.status} className="text-[13px]" />
            <OrderTypeBadge type={o.type} />
            {o.source === "ADMIN" && <Badge tone="gray">Staff-created</Badge>}
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">Placed {dateTime(o.placedAt)} · {timeAgo(o.placedAt)}{o.estimatedReadyAt && status !== "COMPLETED" && status !== "CANCELLED" ? ` · ETA ${dateTime(o.estimatedReadyAt).split(", ").pop()}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can("whatsapp:manage") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" loading={send.isPending}><MessageCircle /> Message <ChevronDown className="!size-3.5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent><DropdownMenuLabel>Send via WhatsApp</DropdownMenuLabel>{ORDER_MESSAGES.map((k) => <DropdownMenuItem key={k} onSelect={() => send.mutate(k)}>{TEMPLATE_DEFAULTS[k].name}</DropdownMenuItem>)}</DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button asChild variant="outline"><a href={`/admin/receipt/${o.id}`} target="_blank" rel="noreferrer"><Printer /> Receipt</a></Button>
          {needsDriver && can("orders:manage") && <Button variant="outline" onClick={() => setAssigning(true)}><Bike /> Assign driver</Button>}
          {cancel && <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => run(cancel)} disabled={transition.isPending}>{actionLabel(status, cancel)}</Button>}
          {forward.map((to) => (
            <Button key={to} onClick={() => run(to)} loading={transition.isPending && transition.variables?.status === to} disabled={to === "OUT_FOR_DELIVERY" && needsDriver && roleKey !== "DELIVERY"}>
              <Check /> {actionLabel(status, to)}
            </Button>
          ))}
        </div>
      </div>

      {forward.includes("OUT_FOR_DELIVERY") && needsDriver && roleKey !== "DELIVERY" && (
        <p role="status" className="mb-4 rounded-lg border border-[var(--tone-amber-fg)]/30 bg-[var(--tone-amber-bg)] px-4 py-2.5 text-[13px] text-[var(--tone-amber-fg)]">Assign a driver before sending this order out for delivery.</p>
      )}
      {status === "CANCELLED" && o.cancelReason && (
        <p role="status" className="mb-4 rounded-lg border border-destructive/25 bg-destructive/8 px-4 py-2.5 text-[13px] text-destructive">Cancelled: {o.cancelReason}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Items ({o.items.reduce((s, i) => s + i.quantity, 0)})</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y">
                {o.items.map((i) => (
                  <li key={i.id} className="flex items-start justify-between gap-4 py-3 first:pt-0">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium"><span className="tabular text-muted-foreground">{i.quantity} ×</span> {i.productName}</p>
                      {i.options.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{i.options.map((op) => op.name).join(" · ")}</p>}
                      {i.notes && <p className="mt-1 text-xs italic text-muted-foreground">“{i.notes}”</p>}
                    </div>
                    <div className="text-end"><p className="tabular text-[13.5px]">{money(i.lineTotal)}</p>{i.quantity > 1 && <p className="tabular text-xs text-muted-foreground">{money(i.unitPrice)} each</p>}</div>
                  </li>
                ))}
              </ul>
              <dl className="mt-2 space-y-1.5 border-t pt-4 text-[13px]">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular">{money(o.subtotal)}</dd></div>
                {o.discountTotal > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Discount{o.couponCode ? ` (${o.couponCode})` : ""}</dt><dd className="tabular">−{money(o.discountTotal)}</dd></div>}
                {o.deliveryFee > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Delivery{o.zoneName ? ` · ${o.zoneName}` : ""}</dt><dd className="tabular">{money(o.deliveryFee)}</dd></div>}
                {o.serviceFee > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Service fee</dt><dd className="tabular">{money(o.serviceFee)}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd className="tabular">{money(o.taxTotal)}</dd></div>
                <div className="flex justify-between border-t pt-3 text-base font-semibold"><dt>Total</dt><dd className="tabular">{money(o.total)}</dd></div>
              </dl>
              {o.notes && <div className="mt-4 rounded-lg bg-muted/60 p-3 text-[13px]"><p className="mb-0.5 text-xs font-medium text-muted-foreground">Customer note</p>{o.notes}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative space-y-5 ps-6 before:absolute before:inset-y-1 before:start-[7px] before:w-px before:bg-border">
                {[...o.events].reverse().map((e, i) => (
                  <li key={e.id} className="relative">
                    <span className={cn("absolute -start-6 top-1 size-3.5 rounded-full border-2 border-card", i === 0 ? "bg-primary ring-4 ring-primary/15" : "bg-muted-foreground/40")} />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <p className="text-[13.5px] font-medium">{STATUS_META[e.status as OrderStatus]?.label ?? e.status}</p>
                      <p className="text-xs text-muted-foreground">{dateTime(e.createdAt)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{e.actorName ?? "System"}{e.note ? ` — ${e.note}` : ""}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle>{can("customers:view") && <Button asChild variant="ghost" size="sm"><Link href={`/admin/customers/${o.customer.id}`}>Profile <ExternalLink /></Link></Button>}</CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <InfoRow icon={User2}><p className="font-medium">{o.customer.name}</p>{o.customer.email && <p className="truncate text-xs text-muted-foreground">{o.customer.email}</p>}</InfoRow>
                <InfoRow icon={Phone}><a href={`tel:${o.customer.phone}`} className="tabular hover:underline">{o.customer.phone}</a></InfoRow>
                <InfoRow icon={MessageCircle}><a href={whatsappLink(o.customer.phone)} target="_blank" rel="noreferrer" className="hover:underline">Open WhatsApp chat</a></InfoRow>
              </ul>
              {o.customer.notes && <p className="mt-3 rounded-md bg-muted/60 p-2.5 text-xs">{o.customer.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{o.type === "DELIVERY" ? "Delivery" : o.type === "PICKUP" ? "Pickup" : "Dine-in"}</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {o.type === "DELIVERY" && <InfoRow icon={MapPin}><p className="font-medium">{o.zoneName ?? "—"}</p><p className="text-muted-foreground">{address || "No address"}</p>{o.deliveryNotes && <p className="mt-1 text-xs italic text-muted-foreground">“{o.deliveryNotes}”</p>}{address && <a className="mt-1 inline-block text-xs text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.addressLine ?? ""} ${o.zoneName ?? ""} Amman`)}`}>Open in Maps</a>}</InfoRow>}
                {o.estimatedReadyAt && <InfoRow icon={Clock}>Estimated {o.type === "DELIVERY" ? "arrival" : "ready"}: <span className="font-medium">{dateTime(o.estimatedReadyAt).split(", ").pop()}</span></InfoRow>}
                {o.type === "DELIVERY" && <InfoRow icon={Bike}>{o.driver ? <span>Driver: <span className="font-medium">{o.driver.name}</span></span> : <span className="text-muted-foreground">No driver assigned</span>}{can("orders:manage") && status !== "COMPLETED" && status !== "CANCELLED" && <button onClick={() => setAssigning(true)} className="ms-2 text-xs text-primary hover:underline">{o.driver ? "Change" : "Assign"}</button>}</InfoRow>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment</CardTitle>{p && <PaymentStatusBadge status={p.status} />}</CardHeader>
            <CardContent>
              {p ? (
                <>
                  <ul className="space-y-3">
                    <InfoRow icon={Wallet}><p className="font-medium">{p.method === "CASH" ? "Cash on delivery / pickup" : `Online${p.provider ? ` · ${p.provider}` : ""}`}</p><p className="tabular text-muted-foreground">{money(p.amount)}{p.paidAt ? ` · paid ${dateTime(p.paidAt)}` : ""}</p>{p.providerRef && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Ref {p.providerRef}</p>}</InfoRow>
                  </ul>
                  {can("payments:update") && (p.status === "PENDING" || p.status === "PAID" || p.status === "FAILED") && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(p.status === "PENDING" || p.status === "FAILED") && <Button size="sm" variant="outline" loading={payment.isPending} onClick={() => payment.mutate({ paymentId: p.id, status: "PAID" })}>Mark as paid</Button>}
                      {p.status === "PENDING" && <Button size="sm" variant="ghost" onClick={() => payment.mutate({ paymentId: p.id, status: "FAILED" })}>Mark failed</Button>}
                      {p.status === "PAID" && <Button size="sm" variant="outline" onClick={() => refund(p)}>Refund</Button>}
                    </div>
                  )}
                </>
              ) : <p className="text-[13px] text-muted-foreground">No payment record.</p>}
            </CardContent>
          </Card>

          {(o.messages.length > 0) && (
            <Card>
              <CardHeader><CardTitle>Customer messages</CardTitle></CardHeader>
              <CardContent>
                {queued.length > 0 && <p className="mb-3 text-xs text-muted-foreground">Ready to send — WhatsApp opens with the message filled in.</p>}
                <ul className="space-y-3">
                  {o.messages.map((m) => (
                    <li key={m.id} className="text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{TEMPLATE_DEFAULTS[m.templateKey as keyof typeof TEMPLATE_DEFAULTS]?.name ?? m.templateKey}</span>
                        {m.status === "QUEUED" && m.link ? <Button size="sm" variant="outline" onClick={() => markSent.mutate({ id: m.id, link: m.link! })}><MessageCircle /> Send</Button> : <Badge tone={m.status === "SENT" ? "green" : "gray"}>{m.status === "SENT" ? "Sent" : m.status.toLowerCase()}</Badge>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.body}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/80">{timeAgo(m.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {assigning && <AssignDriverDialog orderId={o.id} current={o.driver?.id ?? null} onClose={() => setAssigning(false)} />}
    </div>
  );
}
