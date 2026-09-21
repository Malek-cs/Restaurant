"use client";

import { ScrollText } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUrlState } from "@/hooks/use-url-state";
import type { AuditList } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";

type Row = AuditList["rows"][number];

export function AuditView() {
  const { dateTime } = useFormat();
  const [f, set] = useUrlState({ q: "", entity: "", page: "1" });
  const { data, isLoading, error, refetch } = useApiQuery<AuditList>("/api/admin/audit-logs", { page: Number(f.page), pageSize: 25, q: f.q, entity: f.entity }, { placeholderData: (p) => p });

  const columns: Column<Row>[] = [
    { key: "summary", header: "Activity", mobile: "title", cell: (r) => <span className="font-normal">{r.summary}</span> },
    { key: "user", header: "User", cell: (r) => <span className="whitespace-nowrap font-medium">{r.userName}</span> },
    { key: "entity", header: "Entity", cell: (r) => <Badge tone="gray">{r.entity}</Badge> },
    { key: "action", header: "Action", className: "hidden xl:table-cell", mobile: "hide", cell: (r) => <code className="text-xs text-muted-foreground">{r.action}</code> },
    { key: "time", header: "When", cell: (r) => <span className="whitespace-nowrap text-[13px] text-muted-foreground">{dateTime(r.createdAt)}</span> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Audit log" description="A permanent record of who changed what. Entries can't be edited or deleted from the dashboard." />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-3 sm:p-4">
          <SearchInput value={f.q} onChange={(q) => set({ q })} placeholder="Search activity or user" className="w-full sm:w-72" />
          <Select aria-label="Entity" value={f.entity} onChange={(e) => set({ entity: e.target.value })} className="w-auto"><option value="">All entities</option>{data?.entities.map((e) => <option key={e} value={e}>{e}</option>)}</Select>
        </div>
        <DataTable columns={columns} rows={data?.rows} rowKey={(r) => r.id} loading={isLoading} error={error?.message} onRetry={() => refetch()} skeletonRows={10}
          pagination={data ? { page: Number(f.page), pageSize: 25, total: data.total, onPageChange: (p) => set({ page: p }, { resetPage: false }) } : undefined}
          empty={{ icon: ScrollText, title: "No activity found", description: "Try a different search." }} />
      </Card>
    </div>
  );
}
