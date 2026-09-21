"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ShoppingBag, X } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUrlState } from "@/hooks/use-url-state";
import type { OrderList, OrderRow } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { ExportMenu } from "@/components/shared/export-menu";
import { OrderStatusBadge, OrderTypeBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { NewOrderDialog } from "@/components/admin/orders/new-order-dialog";
import { STATUS_META, type OrderStatus } from "@/lib/order-status";
import { timeAgo } from "@/utils/format";
import { cn } from "@/lib/utils";

const TABS: { key: string; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "", label: "All" },
  ...(["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"] as OrderStatus[]).map((s) => ({ key: s, label: STATUS_META[s].label })),
];

export function OrdersView({ canCreate, canExport, defaultActive }: { canCreate: boolean; canExport: boolean; defaultActive: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { money, time, date } = useFormat();
  const [f, set] = useUrlState({ tab: defaultActive ? "active" : "", q: "", type: "", payment: "", from: "", to: "", sort: "placedAt", dir: "desc", page: "1" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (sp.get("new") === "1" && canCreate) {
      setCreating(true);
      router.replace("/admin/orders");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tab = f.tab === "all" ? "" : f.tab;
  const params = {
    page: Number(f.page),
    pageSize: 15,
    q: f.q,
    status: tab && tab !== "active" ? tab : undefined,
    active: tab === "active" ? "1" : undefined,
    type: f.type,
    payment: f.payment,
    from: f.from,
    to: f.to,
    sort: f.sort,
    dir: f.dir,
  };
  const { data, isLoading, error, refetch } = useApiQuery<OrderList>("/api/admin/orders", params, { refetchInterval: 15_000, placeholderData: (prev) => prev });
  const counts = data?.counts ?? {};
  const activeCount = ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].reduce((s, k) => s + (counts[k] ?? 0), 0);
  const allCount = Object.values(counts).reduce((s, n) => s + n, 0);
  const hasFilters = !!(f.q || f.type || f.payment || f.from || f.to);

  const columns: Column<OrderRow>[] = [
    { key: "number", header: "Order", sortKey: "number", mobile: "title", cell: (o) => <span className="tabular font-medium">#{o.number}</span> },
    { key: "customer", header: "Customer", cell: (o) => (<div className="min-w-0"><p className="truncate font-medium">{o.customer.name}</p><p className="tabular text-xs text-muted-foreground">{o.customer.phone}</p></div>) },
    { key: "type", header: "Type", cell: (o) => <OrderTypeBadge type={o.type} /> },
    { key: "items", header: "Items", align: "end", cell: (o) => <span className="tabular">{o._count.items}</span>, className: "hidden xl:table-cell", mobile: "hide" },
    { key: "total", header: "Total", sortKey: "total", align: "end", cell: (o) => <span className="tabular font-medium">{money(o.total)}</span> },
    { key: "payment", header: "Payment", cell: (o) => (o.payment ? (<div className="flex flex-col items-start gap-1"><PaymentStatusBadge status={o.payment.status} /><span className="text-[11px] text-muted-foreground">{o.payment.method === "CASH" ? "Cash" : "Online"}</span></div>) : "—"), mobile: "hide" },
    { key: "status", header: "Status", sortKey: "status", cell: (o) => <OrderStatusBadge status={o.status} /> },
    { key: "placed", header: "Placed", sortKey: "placedAt", cell: (o) => (<div><p className="text-[13px]">{timeAgo(o.placedAt)}</p><p className="text-xs text-muted-foreground">{date(o.placedAt)} · {time(o.placedAt)}</p></div>) },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Orders"
        description="Every order from your website and front desk. New orders appear automatically."
        actions={
          <>
            {canExport && <ExportMenu type="orders" params={{ status: params.status, type: f.type, payment: f.payment, from: f.from, to: f.to, q: f.q, active: params.active }} />}
            {canCreate && <Button onClick={() => setCreating(true)}><Plus /> New order</Button>}
          </>
        }
      />

      <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Order status">
        {TABS.map((t) => {
          const n = t.key === "active" ? activeCount : t.key === "" ? allCount : (counts[t.key] ?? 0);
          const on = tab === t.key;
          return (
            <button key={t.key || "all"} role="tab" aria-selected={on} onClick={() => set({ tab: t.key || "all" })} className={cn("inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
              {t.label}
              <span className={cn("tabular rounded-full px-1.5 text-[11px]", on ? "bg-white/20" : "bg-muted")}>{n}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-3 sm:p-4">
          <SearchInput value={f.q} onChange={(q) => set({ q })} placeholder="Search # , name or phone" className="w-full sm:w-64" />
          <Select aria-label="Order type" value={f.type} onChange={(e) => set({ type: e.target.value })} className="w-auto"><option value="">All types</option><option value="DELIVERY">Delivery</option><option value="PICKUP">Pickup</option><option value="DINE_IN">Dine-in</option></Select>
          <Select aria-label="Payment status" value={f.payment} onChange={(e) => set({ payment: e.target.value })} className="w-auto"><option value="">Any payment</option><option value="PAID">Paid</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></Select>
          <Input type="date" aria-label="From date" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} className="w-[9.5rem]" />
          <Input type="date" aria-label="To date" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} className="w-[9.5rem]" />
          {hasFilters && <Button variant="ghost" size="sm" onClick={() => set({ q: "", type: "", payment: "", from: "", to: "" })}><X /> Clear</Button>}
        </div>
        <DataTable
          columns={columns}
          rows={data?.rows}
          rowKey={(o) => o.id}
          loading={isLoading}
          error={error?.message}
          onRetry={() => refetch()}
          onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
          sort={{ key: f.sort, dir: f.dir as "asc" | "desc" }}
          onSortChange={(sort, dir) => set({ sort, dir })}
          pagination={data ? { page: Number(f.page), pageSize: 15, total: data.total, onPageChange: (p) => set({ page: p }, { resetPage: false }) } : undefined}
          empty={{ icon: ShoppingBag, title: hasFilters || tab ? "No orders match these filters" : "No orders yet", description: hasFilters || tab ? "Try a different status or clear the filters." : "Orders placed on your website will appear here." }}
        />
      </Card>

      {creating && <NewOrderDialog open onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); router.push(`/admin/orders/${id}`); }} />}
    </div>
  );
}
