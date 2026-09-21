import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function KpiCard({ label, value, icon: Icon, delta, lowerIsBetter, hint, loading }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; delta?: number | null; lowerIsBetter?: boolean; hint?: string; loading?: boolean }) {
  const good = delta == null || delta === 0 ? null : lowerIsBetter ? delta < 0 : delta > 0;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground/70" />}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="font-display tabular mt-2 text-[30px] font-medium leading-none tracking-tight sm:text-[34px]">{value}</p>
      )}
      <div className="mt-2.5 flex h-4 items-center gap-1.5 text-xs">
        {loading ? null : delta === undefined ? (
          hint && <span className="text-muted-foreground">{hint}</span>
        ) : delta === null ? (
          <span className="text-muted-foreground">New activity</span>
        ) : (
          <>
            <span className={cn("inline-flex items-center gap-0.5 font-medium", good === null ? "text-muted-foreground" : good ? "text-[var(--tone-green-fg)]" : "text-[var(--tone-red-fg)]")}>
              {delta === 0 ? <Minus className="size-3" /> : delta > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs previous period</span>
          </>
        )}
      </div>
    </Card>
  );
}
