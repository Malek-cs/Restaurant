"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUrlState } from "@/hooks/use-url-state";
import type { CustomerList } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { ExportMenu } from "@/components/shared/export-menu";
import { initials, timeAgo } from "@/utils/format";

type Row = CustomerList["rows"][number];

export function CustomersView({ canExport }: { canExport: boolean }) {
  const router = useRouter();
  const { money, date } = useFormat();
  const [f, set] = useUrlState({ q: "", sort: "createdAt", dir: "desc", page: "1" });
  const { data, isLoading, error, refetch } = useApiQuery<CustomerList>("/api/admin/customers", { page: Number(f.page), pageSize: 15, q: f.q, sort: f.sort, dir: f.dir }, { placeholderData: (p) => p });

  const columns: Column<Row>[] = [
    { key: "name", header: "Customer", sortKey: "name", mobile: "title", cell: (c) => (
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{initials(c.name)}</span><div className="min-w-0"><p className="truncate font-medium">{c.name}</p><p className="tabular truncate text-xs text-muted-foreground">{c.phone}</p></div></div>) },
    { key: "email", header: "Email", className: "hidden xl:table-cell", cell: (c) => <span className="text-muted-foreground">{c.email ?? "—"}</span> },
    { key: "orders", header: "Orders", sortKey: "orders", align: "end", cell: (c) => <span className="tabular">{c.orders}</span> },
    { key: "spent", header: "Total spent", sortKey: "spent", align: "end", cell: (c) => <span className="tabular font-medium">{money(c.spent)}</span> },
    { key: "last", header: "Last order", sortKey: "lastOrder", cell: (c) => (c.lastOrderAt ? timeAgo(c.lastOrderAt) : <span className="text-muted-foreground">Never</span>) },
    { key: "reg", header: "Registered", sortKey: "createdAt", cell: (c) => date(c.createdAt) },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Customers" description="Guests are added automatically the first time they order." actions={canExport && <ExportMenu type="customers" params={{ q: f.q }} />} />
      <Card>
        <div className="border-b p-3 sm:p-4"><SearchInput value={f.q} onChange={(q) => set({ q })} placeholder="Search name, phone or email" className="w-full sm:w-80" /></div>
        <DataTable
          columns={columns}
          rows={data?.rows}
          rowKey={(c) => c.id}
          loading={isLoading}
          error={error?.message}
          onRetry={() => refetch()}
          sort={{ key: f.sort, dir: f.dir as "asc" | "desc" }}
          onSortChange={(sort, dir) => set({ sort, dir })}
          onRowClick={(c) => router.push(`/admin/customers/${c.id}`)}
          pagination={data ? { page: Number(f.page), pageSize: 15, total: data.total, onPageChange: (p) => set({ page: p }, { resetPage: false }) } : undefined}
          empty={{ icon: Users, title: f.q ? "No customers found" : "No customers yet", description: f.q ? "Check the spelling or try a phone number." : "They'll appear here after their first order." }}
        />
      </Card>
    </div>
  );
}
