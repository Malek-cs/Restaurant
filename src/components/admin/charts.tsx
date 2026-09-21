"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormat } from "@/hooks/use-restaurant";
import { formatNumber } from "@/utils/format";
import { currencyDigits } from "@/utils/money";

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--muted-foreground)", fontSize: 12 },
} as const;

interface TipProps {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[];
  label?: string;
  fmt: (n: number, name?: string) => string;
}

function ChartTooltip({ active, payload, label, fmt }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}
          <span className="tabular ms-auto ps-3 font-medium text-foreground">{fmt(Number(p.value ?? 0), p.name)}</span>
        </p>
      ))}
    </div>
  );
}

function useMoneyAxis() {
  const { restaurant, money } = useFormat();
  const digits = currencyDigits(restaurant.currency);
  const short = (v: number) => {
    const major = v / 10 ** digits;
    return major >= 1000 ? `${(major / 1000).toFixed(major >= 10000 ? 0 : 1)}k` : String(Math.round(major));
  };
  return { money, short };
}

export function RevenueChart({ data, height = 280 }: { data: { label: string; revenue: number }[]; height?: number }) {
  const { money, short } = useMoneyAxis();
  return (
    <div style={{ height }} role="img" aria-label="Revenue over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis dataKey="label" {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} tickFormatter={short} width={44} />
          <Tooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltip fmt={(n) => money(n)} />} />
          <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#rev)" activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrdersChart({ data, height = 280 }: { data: { label: string; orders: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Orders over time">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis dataKey="label" {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} allowDecimals={false} width={44} />
          <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.5 }} content={<ChartTooltip fmt={(n) => formatNumber(n)} />} />
          <Bar dataKey="orders" name="Orders" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CustomerGrowthChart({ data, height = 280 }: { data: { label: string; newCustomers: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="New customers over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis dataKey="label" {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} allowDecimals={false} width={44} />
          <Tooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltip fmt={(n) => formatNumber(n)} />} />
          <Line type="monotone" dataKey="newCustomers" name="New customers" stroke="var(--chart-3)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, valueFormat = "money", height = 220 }: { data: { name: string; value: number }[]; valueFormat?: "money" | "number"; height?: number }) {
  const { money } = useFormat();
  const total = data.reduce((s, d) => s + d.value, 0);
  const fmt = (n: number) => (valueFormat === "money" ? money(n) : formatNumber(n));
  if (!total) return <div className="grid place-items-center text-[13px] text-muted-foreground" style={{ height }}>No data for this period</div>;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="size-[150px] shrink-0" role="img" aria-label="Breakdown chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70} paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip fmt={(n) => fmt(n)} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-[13px]">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="truncate">{d.name}</span>
            <span className="tabular ms-auto shrink-0 text-muted-foreground">{((d.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HorizontalBars({ data, valueFormat = "number", height }: { data: { name: string; value: number }[]; valueFormat?: "money" | "number"; height?: number }) {
  const { money, short } = useMoneyAxis();
  const h = height ?? Math.max(160, data.length * 36 + 16);
  if (!data.length) return <div className="grid h-40 place-items-center text-[13px] text-muted-foreground">No data for this period</div>;
  return (
    <div style={{ height: h }} role="img" aria-label="Ranking chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis type="number" {...axisProps} tickFormatter={valueFormat === "money" ? short : undefined} />
          <YAxis type="category" dataKey="name" {...axisProps} width={150} tick={{ fill: "var(--foreground)", fontSize: 12 }} tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 21) + "…" : v)} />
          <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.5 }} content={<ChartTooltip fmt={(n) => (valueFormat === "money" ? money(n) : formatNumber(n))} />} />
          <Bar dataKey="value" name={valueFormat === "money" ? "Revenue" : "Sold"} fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
