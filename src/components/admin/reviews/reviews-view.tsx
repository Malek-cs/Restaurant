"use client";

import Link from "next/link";
import { Check, EyeOff, MessageSquareText, Trash2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUrlState } from "@/hooks/use-url-state";
import type { ReviewList } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { StarRating } from "@/components/shared/star-rating";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";

const tone: Record<string, Tone> = { PENDING: "amber", APPROVED: "green", HIDDEN: "gray" };

export function ReviewsView() {
  const { date } = useFormat();
  const confirm = useConfirm();
  const [f, set] = useUrlState({ status: "", rating: "", q: "", page: "1" });
  const { data, isLoading, error, refetch } = useApiQuery<ReviewList>("/api/admin/reviews", { page: Number(f.page), pageSize: 10, status: f.status, rating: f.rating, q: f.q }, { placeholderData: (p) => p });
  const inv = ["/api/admin/reviews", "/api/admin/analytics"];
  const setStatus = useApiMutation((v: { id: string; status: string }) => api.patch(`/api/admin/reviews/${v.id}`, { status: v.status }), { invalidate: inv, success: (_, v) => (v.status === "APPROVED" ? "Review approved and published." : v.status === "HIDDEN" ? "Review hidden from the website." : "Review updated.") });
  const remove = useApiMutation((id: string) => api.del(`/api/admin/reviews/${id}`), { invalidate: inv, success: "Review deleted." });

  async function onDelete(id: string) {
    const r = await confirm({ title: "Delete this review?", description: "This permanently removes it. Consider hiding it instead.", confirmLabel: "Delete review", destructive: true });
    if (r.confirmed) remove.mutate(id);
  }

  const s = data?.summary;
  const max = Math.max(1, ...[1, 2, 3, 4, 5].map((n) => s?.byRating[n] ?? 0));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Reviews" description="Guest reviews are held for approval before they appear on your website." />
      <div className="mb-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="p-5">
          <p className="text-[13px] text-muted-foreground">Average rating</p>
          {isLoading ? <Skeleton className="mt-3 h-10 w-24" /> : (
            <>
              <p className="font-display tabular mt-2 text-[44px] font-medium leading-none">{s && s.approvedCount ? s.average.toFixed(1) : "—"}</p>
              <StarRating value={s?.average ?? 0} size={16} className="mt-2" />
              <p className="mt-1.5 text-xs text-muted-foreground">{s?.approvedCount ?? 0} approved reviews</p>
            </>
          )}
        </Card>
        <Card className="p-5">
          <ul className="space-y-2" aria-label="Rating distribution">
            {[5, 4, 3, 2, 1].map((n) => (
              <li key={n} className="flex items-center gap-3 text-[13px]">
                <span className="tabular w-4 text-muted-foreground">{n}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brass" style={{ width: `${((s?.byRating[n] ?? 0) / max) * 100}%` }} /></div>
                <span className="tabular w-8 text-end text-muted-foreground">{s?.byRating[n] ?? 0}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-3 sm:p-4">
          <SearchInput value={f.q} onChange={(q) => set({ q })} placeholder="Search comments or names" className="w-full sm:w-64" />
          <Select aria-label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })} className="w-auto">
            <option value="">All statuses</option>
            <option value="PENDING">Pending{s?.byStatus.PENDING ? ` (${s.byStatus.PENDING})` : ""}</option>
            <option value="APPROVED">Approved</option><option value="HIDDEN">Hidden</option>
          </Select>
          <Select aria-label="Rating" value={f.rating} onChange={(e) => set({ rating: e.target.value })} className="w-auto"><option value="">Any rating</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</Select>
        </div>
        {error ? <ErrorState message={error.message} onRetry={() => refetch()} /> : isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : data && data.rows.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="No reviews found" description={f.status || f.rating || f.q ? "Try clearing the filters." : "Guests can review an order once it's completed."} />
        ) : (
          <ul className="divide-y">
            {data?.rows.map((r) => (
              <li key={r.id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5", r.status === "PENDING" && "bg-[var(--tone-amber-bg)]/30")}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StarRating value={r.rating} />
                    <Badge tone={tone[r.status]} dot>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed">{r.comment ?? <span className="italic text-muted-foreground">No written comment</span>}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <Link href={`/admin/customers/${r.customer.id}`} className="font-medium text-foreground hover:underline">{r.customer.name}</Link>
                    {r.order && <> · <Link href={`/admin/orders/${r.order.id}`} className="hover:underline">Order #{r.order.number}</Link></>} · {date(r.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status !== "APPROVED" && <Button size="sm" onClick={() => setStatus.mutate({ id: r.id, status: "APPROVED" })}><Check /> Approve</Button>}
                  {r.status !== "HIDDEN" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: "HIDDEN" })}><EyeOff /> Hide</Button>}
                  <Button size="icon-sm" variant="ghost" aria-label="Delete review" onClick={() => onDelete(r.id)}><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={Number(f.page)} pageSize={10} total={data.total} onPageChange={(p) => set({ page: p }, { resetPage: false })} />}
      </Card>
    </div>
  );
}
