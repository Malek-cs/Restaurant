"use client";

import Link from "next/link";
import { ArrowRight, Ban, CheckCircle2, Clock, Plus, Receipt, ShoppingBag, Star, UserPlus, Wallet, TicketPercent, UtensilsCrossed } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUrlState } from "@/hooks/use-url-state";
import type { AnalyticsResult } from "@/services/analytics.service";
import { PageHeader } from "@/components/shared/page-header";
import { DateRangeFilter, type RangeValue } from "@/components/shared/date-range-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/empty-state";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { KpiCard, pctChange } from "@/components/admin/kpi-card";
import { DonutChart, HorizontalBars, OrdersChart, RevenueChart } from "@/components/admin/charts";
import { formatNumber } from "@/utils/format";
import { RANGE_LABELS } from "@/lib/dates";

interface RecentOrders { rows: { id: string; number: number; total: number; status: string; placedAt: string; type: string; customer: { name: string } }[] }

export function DashboardView({ userName, actions }: { userName: string; actions: { order: boolean; product: boolean; coupon: boolean } }) {
  const [state, setState] = useUrlState({ range: "today", from: "", to: "" });
  const value: RangeValue = { range: state.range as RangeValue["range"], from: state.from || undefined, to: state.to || undefined };
  const { money, dateTime, time } = useFormat();
  const { data, isLoading, error, refetch } = useApiQuery<AnalyticsResult>("/api/admin/analytics", { range: value.range, from: value.from, to: value.to });
  const recent = useApiQuery<RecentOrders>("/api/admin/orders", { pageSize: 6, sort: "placedAt", dir: "desc" }, { refetchInterval: 20_000 });

  const label = data?.range.label ?? RANGE_LABELS[value.range];
  const isToday = value.range === "today";
  const k = data?.kpis;
  const p = data?.previous;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Hello, ${userName}`}
        description={`A quick read on the restaurant — ${label.toLowerCase()}.`}
        actions={
          <>
            {actions.order && <Button asChild><Link href="/admin/orders?new=1"><Plus /> New order</Link></Button>}
            {actions.product && <Button asChild variant="outline"><Link href="/admin/menu?new=1"><UtensilsCrossed /> Add dish</Link></Button>}
            {actions.coupon && <Button asChild variant="outline" className="hidden sm:inline-flex"><Link href="/admin/discounts?new=1"><TicketPercent /> Coupon</Link></Button>}
          </>
        }
      />

      <div className="mb-5"><DateRangeFilter value={value} onChange={(v) => setState({ range: v.range, from: v.range === "custom" ? v.from : "", to: v.range === "custom" ? v.to : "" })} /></div>

      {error ? (
        <Card><ErrorState message={error.message} onRetry={() => refetch()} /></Card>
      ) : (
        <>
          <section aria-label="Key figures" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <KpiCard label={isToday ? "Today's revenue" : "Revenue"} value={k ? money(k.revenue, { compact: true }) : ""} icon={Wallet} delta={k && p ? pctChange(k.revenue, p.revenue) : undefined} loading={isLoading} />
            <KpiCard label={isToday ? "Today's orders" : "Orders"} value={k ? formatNumber(k.orders) : ""} icon={ShoppingBag} delta={k && p ? pctChange(k.orders, p.orders) : undefined} loading={isLoading} />
            <KpiCard label="Pending orders" value={data ? formatNumber(data.pendingNow) : ""} icon={Clock} hint="In the kitchen right now" loading={isLoading} />
            <KpiCard label="Completed" value={k ? formatNumber(k.completed) : ""} icon={CheckCircle2} delta={k && p ? pctChange(k.completed, p.completed) : undefined} loading={isLoading} />
            <KpiCard label="Cancelled" value={k ? formatNumber(k.cancelled) : ""} icon={Ban} delta={k && p ? pctChange(k.cancelled, p.cancelled) : undefined} lowerIsBetter loading={isLoading} />
            <KpiCard label="Average order value" value={k ? money(k.averageOrder) : ""} icon={Receipt} delta={k && p ? pctChange(k.averageOrder, p.averageOrder) : undefined} loading={isLoading} />
            <KpiCard label="New customers" value={data ? formatNumber(data.newCustomers) : ""} icon={UserPlus} delta={data ? pctChange(data.newCustomers, data.previousNewCustomers) : undefined} loading={isLoading} />
            <KpiCard label="Average rating" value={data ? (data.rating.count ? data.rating.average.toFixed(1) : "—") : ""} icon={Star} hint={data ? `${data.rating.count} approved reviews` : undefined} loading={isLoading} />
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><div><CardTitle>Revenue over time</CardTitle><CardDescription>{data?.range.bucket === "hour" ? "By hour" : "By day"}, excluding cancelled orders</CardDescription></div></CardHeader>
              <CardContent className="pt-4">{isLoading ? <Skeleton className="h-[280px]" /> : <RevenueChart data={data!.series} />}</CardContent>
            </Card>
            <Card>
              <CardHeader><div><CardTitle>Sales by category</CardTitle><CardDescription>Share of item revenue</CardDescription></div></CardHeader>
              <CardContent className="pt-4">{isLoading ? <Skeleton className="h-[220px]" /> : <DonutChart data={data!.byCategory.map((c) => ({ name: c.name, value: c.revenue }))} />}</CardContent>
            </Card>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><div><CardTitle>Orders over time</CardTitle><CardDescription>{data?.range.bucket === "hour" ? "By hour" : "By day"}</CardDescription></div></CardHeader>
              <CardContent className="pt-4">{isLoading ? <Skeleton className="h-[260px]" /> : <OrdersChart data={data!.series} height={260} />}</CardContent>
            </Card>
            <Card>
              <CardHeader><div><CardTitle>Best-selling dishes</CardTitle><CardDescription>Units sold</CardDescription></div></CardHeader>
              <CardContent className="pt-4">{isLoading ? <Skeleton className="h-[260px]" /> : <HorizontalBars data={data!.topProducts.slice(0, 6).map((t) => ({ name: t.name, value: t.quantity }))} height={260} />}</CardContent>
            </Card>
            <Card>
              <CardHeader><div><CardTitle>Payment methods</CardTitle><CardDescription>Share of order value</CardDescription></div></CardHeader>
              <CardContent className="pt-4">{isLoading ? <Skeleton className="h-[220px]" /> : <DonutChart data={data!.paymentMethods.map((m) => ({ name: m.method === "CASH" ? "Cash" : "Online", value: m.revenue }))} />}</CardContent>
            </Card>
          </section>

          <Card className="mt-4">
            <CardHeader>
              <div><CardTitle>Recent orders</CardTitle><CardDescription>Latest activity across all channels</CardDescription></div>
              <Button asChild variant="ghost" size="sm"><Link href="/admin/orders">View all <ArrowRight className="rtl:rotate-180" /></Link></Button>
            </CardHeader>
            <CardContent className="pt-2">
              {recent.isLoading ? (
                <div className="space-y-3 pt-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <ul className="divide-y">
                  {recent.data?.rows.map((o) => (
                    <li key={o.id}>
                      <Link href={`/admin/orders/${o.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/50">
                        <span className="tabular w-14 shrink-0 text-[13px] font-medium">#{o.number}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px]">{o.customer.name}<span className="ms-2 hidden text-muted-foreground sm:inline">{time(o.placedAt)}</span></span>
                        <span className="tabular hidden text-[13px] sm:block">{money(o.total)}</span>
                        <OrderStatusBadge status={o.status} />
                      </Link>
                    </li>
                  ))}
                  {recent.data?.rows.length === 0 && <li className="py-8 text-center text-[13px] text-muted-foreground">No orders yet.</li>}
                </ul>
              )}
            </CardContent>
          </Card>
          <p className="sr-only">{dateTime(new Date())}</p>
        </>
      )}
    </div>
  );
}
