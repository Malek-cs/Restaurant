"use client";

import { useState } from "react";
import { Ban, Repeat, Receipt, ShoppingBag, UserPlus, Wallet } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUrlState } from "@/hooks/use-url-state";
import type { AnalyticsResult } from "@/services/analytics.service";
import { PageHeader } from "@/components/shared/page-header";
import { DateRangeFilter, type RangeValue } from "@/components/shared/date-range-filter";
import { ExportMenu } from "@/components/shared/export-menu";
import { ErrorState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { KpiCard, pctChange } from "@/components/admin/kpi-card";
import { CustomerGrowthChart, DonutChart, HorizontalBars, OrdersChart, RevenueChart } from "@/components/admin/charts";
import { formatNumber, formatPercent } from "@/utils/format";
import { cn } from "@/lib/utils";

export function AnalyticsView({ canExport }: { canExport: boolean }) {
  const [f, set] = useUrlState({ range: "last30", from: "", to: "" });
  const value: RangeValue = { range: f.range as RangeValue["range"], from: f.from || undefined, to: f.to || undefined };
  const { money } = useFormat();
  const [metric, setMetric] = useState<"revenue" | "quantity">("revenue");
  const { data, isLoading, error, refetch } = useApiQuery<AnalyticsResult>("/api/admin/analytics", { range: value.range, from: value.from, to: value.to }, { placeholderData: (p) => p });
  const k = data?.kpis;
  const p = data?.previous;
  const totalCatRevenue = data?.byCategory.reduce((s, c) => s + c.revenue, 0) ?? 0;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Analytics" description="Sales, customers and product performance. Revenue counts every order that wasn't cancelled." actions={canExport && <ExportMenu type="revenue" label="Revenue report" params={{ range: value.range, from: value.from, to: value.to }} />} />
      <div className="mb-5"><DateRangeFilter value={value} onChange={(v) => set({ range: v.range, from: v.range === "custom" ? v.from : "", to: v.range === "custom" ? v.to : "" })} /></div>

      {error ? <Card><ErrorState message={error.message} onRetry={() => refetch()} /></Card> : (
        <>
          <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Revenue" value={k ? money(k.revenue, { compact: true }) : ""} icon={Wallet} delta={k && p ? pctChange(k.revenue, p.revenue) : undefined} loading={isLoading} />
            <KpiCard label="Orders" value={k ? formatNumber(k.orders) : ""} icon={ShoppingBag} delta={k && p ? pctChange(k.orders, p.orders) : undefined} loading={isLoading} />
            <KpiCard label="New customers" value={data ? formatNumber(data.newCustomers) : ""} icon={UserPlus} delta={data ? pctChange(data.newCustomers, data.previousNewCustomers) : undefined} loading={isLoading} />
            <KpiCard label="Average order" value={k ? money(k.averageOrder) : ""} icon={Receipt} delta={k && p ? pctChange(k.averageOrder, p.averageOrder) : undefined} loading={isLoading} />
            <KpiCard label="Repeat customers" value={data ? formatPercent(data.repeatCustomers.rate, 0) : ""} icon={Repeat} hint={data ? `${data.repeatCustomers.repeat} of ${data.repeatCustomers.customers} guests` : undefined} loading={isLoading} />
            <KpiCard label="Cancellation rate" value={data ? formatPercent(data.cancellationRate) : ""} icon={Ban} hint={k ? `${k.cancelled} of ${k.totalOrders} orders` : undefined} loading={isLoading} />
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><div><CardTitle>Revenue</CardTitle><CardDescription>{data?.range.bucket === "hour" ? "By hour" : "By day"}</CardDescription></div></CardHeader><CardContent className="pt-4">{isLoading ? <Skeleton className="h-[280px]" /> : <RevenueChart data={data!.series} />}</CardContent></Card>
            <Card><CardHeader><div><CardTitle>Orders</CardTitle><CardDescription>Completed and in-progress orders</CardDescription></div></CardHeader><CardContent className="pt-4">{isLoading ? <Skeleton className="h-[280px]" /> : <OrdersChart data={data!.series} />}</CardContent></Card>
            <Card><CardHeader><div><CardTitle>Customer growth</CardTitle><CardDescription>New customers per {data?.range.bucket === "hour" ? "hour" : "day"}</CardDescription></div></CardHeader><CardContent className="pt-4">{isLoading ? <Skeleton className="h-[280px]" /> : <CustomerGrowthChart data={data!.series} />}</CardContent></Card>
            <Card>
              <CardHeader>
                <div><CardTitle>Product performance</CardTitle><CardDescription>Top 10 dishes</CardDescription></div>
                <div className="flex rounded-md border p-0.5 text-xs" role="group" aria-label="Metric">
                  {(["revenue", "quantity"] as const).map((m) => <button key={m} onClick={() => setMetric(m)} aria-pressed={metric === m} className={cn("rounded px-2.5 py-1 font-medium transition-colors", metric === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{m === "revenue" ? "Revenue" : "Units"}</button>)}
                </div>
              </CardHeader>
              <CardContent className="pt-4">{isLoading ? <Skeleton className="h-[280px]" /> : <HorizontalBars key={metric} data={[...data!.topProducts].sort((a, b) => b[metric] - a[metric]).map((t) => ({ name: t.name, value: t[metric] }))} valueFormat={metric === "revenue" ? "money" : "number"} />}</CardContent>
            </Card>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card><CardHeader><div><CardTitle>Order types</CardTitle><CardDescription>Share of orders</CardDescription></div></CardHeader><CardContent className="pt-4">{isLoading ? <Skeleton className="h-[200px]" /> : <DonutChart valueFormat="number" data={data!.orderTypes.map((t) => ({ name: t.type === "DINE_IN" ? "Dine-in" : t.type.charAt(0) + t.type.slice(1).toLowerCase(), value: t.orders }))} />}</CardContent></Card>
            <Card><CardHeader><div><CardTitle>Payment methods</CardTitle><CardDescription>Share of order value</CardDescription></div></CardHeader><CardContent className="pt-4">{isLoading ? <Skeleton className="h-[200px]" /> : <DonutChart data={data!.paymentMethods.map((m) => ({ name: m.method === "CASH" ? "Cash" : "Online", value: m.revenue }))} />}</CardContent></Card>
            <Card>
              <CardHeader><div><CardTitle>Top categories</CardTitle><CardDescription>By item revenue</CardDescription></div></CardHeader>
              <CardContent className="p-0 pt-3">
                {isLoading ? <div className="p-5"><Skeleton className="h-[160px]" /></div> : (
                  <Table>
                    <THead><TR className="hover:bg-transparent"><TH>Category</TH><TH className="text-end">Units</TH><TH className="text-end">Revenue</TH></TR></THead>
                    <TBody>
                      {data!.byCategory.map((c) => <TR key={c.name}><TD className="font-medium">{c.name}</TD><TD className="tabular text-end">{formatNumber(c.quantity)}</TD><TD className="tabular text-end">{money(c.revenue)}<span className="ms-2 text-xs text-muted-foreground">{totalCatRevenue ? ((c.revenue / totalCatRevenue) * 100).toFixed(0) : 0}%</span></TD></TR>)}
                      {data!.byCategory.length === 0 && <TR><TD colSpan={3} className="py-8 text-center text-muted-foreground">No sales in this period.</TD></TR>}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="mt-4">
            <CardHeader><div><CardTitle>Top products</CardTitle><CardDescription>Best sellers by units</CardDescription></div></CardHeader>
            <CardContent className="p-0 pt-3">
              {isLoading ? <div className="p-5"><Skeleton className="h-40" /></div> : (
                <Table>
                  <THead><TR className="hover:bg-transparent"><TH className="w-12">#</TH><TH>Dish</TH><TH className="text-end">Units sold</TH><TH className="text-end">Revenue</TH></TR></THead>
                  <TBody>
                    {data!.topProducts.map((t, i) => <TR key={t.name}><TD className="tabular text-muted-foreground">{i + 1}</TD><TD className="font-medium">{t.name}</TD><TD className="tabular text-end">{formatNumber(t.quantity)}</TD><TD className="tabular text-end">{money(t.revenue)}</TD></TR>)}
                    {data!.topProducts.length === 0 && <TR><TD colSpan={4} className="py-8 text-center text-muted-foreground">No sales in this period.</TD></TR>}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
