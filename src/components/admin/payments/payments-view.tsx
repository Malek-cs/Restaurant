"use client";

import Link from "next/link";
import { CreditCard, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUrlState } from "@/hooks/use-url-state";
import type { PaymentList } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { ExportMenu } from "@/components/shared/export-menu";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { useConfirm } from "@/components/shared/confirm-dialog";

type Row = PaymentList["rows"][number];

export function PaymentsView({ canUpdate, canExport }: { canUpdate: boolean; canExport: boolean }) {
  const { money, dateTime } = useFormat();
  const confirm = useConfirm();
  const [f, set] = useUrlState({ q: "", status: "", method: "", from: "", to: "", page: "1" });
  const params = { page: Number(f.page), pageSize: 15, q: f.q, status: f.status, method: f.method, from: f.from, to: f.to };
  const { data, isLoading, error, refetch } = useApiQuery<PaymentList>("/api/admin/payments", params, { placeholderData: (p) => p });

  const update = useApiMutation((v: { id: string; status: string }) => api.patch(`/api/admin/payments/${v.id}`, { status: v.status }), { invalidate: ["/api/admin/payments", "/api/admin/orders", "/api/admin/analytics"], success: "Payment updated." });
  async function refund(p: Row) {
    const r = await confirm({ title: `Refund order #${p.order.number}?`, description: "This records the refund here. Return the money through your payment provider or in cash.", confirmLabel: "Mark refunded", destructive: true });
    if (r.confirmed) update.mutate({ id: p.id, status: "REFUNDED" });
  }

  const columns: Column<Row>[] = [
    { key: "order", header: "Order", mobile: "title", cell: (p) => <Link href={`/admin/orders/${p.order.id}`} onClick={(e) => e.stopPropagation()} className="tabular font-medium hover:underline">#{p.order.number}</Link> },
    { key: "customer", header: "Customer", cell: (p) => p.order.customer.name },
    { key: "method", header: "Method", cell: (p) => (p.method === "CASH" ? "Cash" : "Online") },
    { key: "amount", header: "Amount", align: "end", cell: (p) => <span className="tabular font-medium">{money(p.amount)}</span> },
    { key: "status", header: "Status", cell: (p) => <PaymentStatusBadge status={p.status} /> },
    { key: "date", header: "Date", cell: (p) => <span className="text-[13px]">{dateTime(p.createdAt)}</span> },
    ...(canUpdate ? [{ key: "actions", header: <span className="sr-only">Actions</span>, align: "end" as const, mobile: "action" as const, cell: (p: Row) => (
      <div className="flex justify-end gap-1.5">
        {(p.status === "PENDING" || p.status === "FAILED") && <Button size="sm" variant="outline" onClick={() => update.mutate({ id: p.id, status: "PAID" })}>Mark paid</Button>}
        {p.status === "PAID" && <Button size="sm" variant="ghost" onClick={() => refund(p)}>Refund</Button>}
      </div>) }] : []),
  ];

  const s = data?.summary ?? {};
  const cards = [
    { label: "Paid", key: "PAID" },
    { label: "Pending", key: "PENDING" },
    { label: "Failed", key: "FAILED" },
    { label: "Refunded", key: "REFUNDED" },
  ];
  const hasFilters = !!(f.q || f.status || f.method || f.from || f.to);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Payments" description="Cash and online payments across all orders." actions={canExport && <ExportMenu type="payments" params={{ status: f.status, method: f.method, from: f.from, to: f.to, q: f.q }} />} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <button key={c.key} onClick={() => set({ status: f.status === c.key ? "" : c.key })} className={`rounded-xl border bg-card p-4 text-start transition-colors hover:bg-accent/40 ${f.status === c.key ? "ring-2 ring-primary/40" : ""}`} aria-pressed={f.status === c.key}>
            <p className="text-[13px] text-muted-foreground">{c.label}</p>
            {isLoading ? <Skeleton className="mt-2 h-7 w-24" /> : <p className="font-display tabular mt-1.5 text-[26px] font-medium leading-none">{money(s[c.key]?.amount ?? 0, { compact: true })}</p>}
            <p className="mt-1.5 text-xs text-muted-foreground">{s[c.key]?.count ?? 0} payments</p>
          </button>
        ))}
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-3 sm:p-4">
          <SearchInput value={f.q} onChange={(q) => set({ q })} placeholder="Order # or customer" className="w-full sm:w-64" />
          <Select aria-label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })} className="w-auto"><option value="">All statuses</option><option value="PAID">Paid</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></Select>
          <Select aria-label="Method" value={f.method} onChange={(e) => set({ method: e.target.value })} className="w-auto"><option value="">All methods</option><option value="CASH">Cash</option><option value="ONLINE">Online</option></Select>
          <Input type="date" aria-label="From date" value={f.from} onChange={(e) => set({ from: e.target.value })} className="w-[9.5rem]" />
          <Input type="date" aria-label="To date" value={f.to} onChange={(e) => set({ to: e.target.value })} className="w-[9.5rem]" />
          {hasFilters && <Button variant="ghost" size="sm" onClick={() => set({ q: "", status: "", method: "", from: "", to: "" })}><X /> Clear</Button>}
        </div>
        <DataTable columns={columns} rows={data?.rows} rowKey={(p) => p.id} loading={isLoading} error={error?.message} onRetry={() => refetch()}
          pagination={data ? { page: Number(f.page), pageSize: 15, total: data.total, onPageChange: (p) => set({ page: p }, { resetPage: false }) } : undefined}
          empty={{ icon: CreditCard, title: "No payments found", description: hasFilters ? "Try clearing the filters." : "Payments appear here when orders come in." }} />
      </Card>
    </div>
  );
}
