"use client";

import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUrlState } from "@/hooks/use-url-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { notificationIcon } from "@/components/admin/topbar";
import { timeAgo } from "@/utils/format";
import { cn } from "@/lib/utils";

interface Row { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }
interface Res { total: number; unread: number; rows: Row[] }

export function NotificationsView() {
  const router = useRouter();
  const { dateTime } = useFormat();
  const [f, set] = useUrlState({ unread: "", page: "1" });
  const { data, isLoading, error, refetch } = useApiQuery<Res>("/api/admin/notifications", { page: Number(f.page), pageSize: 20, unread: f.unread ? "1" : undefined }, { refetchInterval: 20_000, placeholderData: (p) => p });
  const markAll = useApiMutation(() => api.post("/api/admin/notifications/read-all"), { invalidate: ["/api/admin/notifications"], success: "All caught up." });
  const markOne = useApiMutation((id: string) => api.post(`/api/admin/notifications/${id}/read`), { invalidate: ["/api/admin/notifications"] });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Notifications" description="New orders, payments, cancellations, low stock and reviews." actions={<Button variant="outline" onClick={() => markAll.mutate()} disabled={!data?.unread} loading={markAll.isPending}><CheckCheck /> Mark all as read</Button>} />
      <div className="mb-4 flex gap-1.5" role="tablist">
        {[{ k: "", l: "All" }, { k: "1", l: `Unread${data ? ` (${data.unread})` : ""}` }].map((t) => (
          <button key={t.k} role="tab" aria-selected={f.unread === t.k} onClick={() => set({ unread: t.k })} className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors", f.unread === t.k ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>{t.l}</button>
        ))}
      </div>
      <Card>
        {error ? <ErrorState message={error.message} onRetry={() => refetch()} /> : isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        : data && data.rows.length === 0 ? <EmptyState icon={f.unread ? BellOff : Bell} title={f.unread ? "Nothing unread" : "No notifications yet"} description="You'll be notified here about new orders, payments and reviews." />
        : (
          <ul className="divide-y">
            {data?.rows.map((n) => {
              const Icon = notificationIcon[n.type] ?? Bell;
              return (
                <li key={n.id}>
                  <button onClick={() => { if (!n.readAt) markOne.mutate(n.id); if (n.link) router.push(n.link); }} className={cn("flex w-full items-start gap-4 px-4 py-4 text-start transition-colors hover:bg-accent/50 sm:px-5", !n.readAt && "bg-primary/[0.05]")}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">{n.title}</span>{n.body && <span className="mt-0.5 block text-[13px] text-muted-foreground">{n.body}</span>}<span className="mt-1 block text-xs text-muted-foreground/80" title={dateTime(n.createdAt)}>{timeAgo(n.createdAt)}</span></span>
                    {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {data && <Pagination page={Number(f.page)} pageSize={20} total={data.total} onPageChange={(p) => set({ page: p }, { resetPage: false })} />}
      </Card>
    </div>
  );
}
