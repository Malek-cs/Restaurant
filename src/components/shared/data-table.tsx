"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Enables server-side sorting on this column. */
  sortKey?: string;
  className?: string;
  align?: "start" | "end";
  /** How the column renders in the mobile card layout. Default: shown as "label: value". */
  mobile?: "title" | "action" | "hide";
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: { icon?: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: React.ReactNode };
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void };
  sort?: { key: string; dir: "asc" | "desc" };
  onSortChange?: (key: string, dir: "asc" | "desc") => void;
  onRowClick?: (row: T) => void;
  skeletonRows?: number;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, empty, pagination, sort, onSortChange, onRowClick, skeletonRows = 6, className }: Props<T>) {
  const titleCol = columns.find((c) => c.mobile === "title") ?? columns[0]!;
  const actionCols = columns.filter((c) => c.mobile === "action");
  const bodyCols = columns.filter((c) => c !== titleCol && c.mobile !== "action" && c.mobile !== "hide");

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  const showEmpty = !loading && rows && rows.length === 0;

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              {columns.map((c) => {
                const active = !!c.sortKey && sort?.key === c.sortKey;
                return (
                  <TH key={c.key} className={cn(c.align === "end" && "text-end", c.className)} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.sortKey && onSortChange ? (
                      <button
                        className={cn("group inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground", active && "text-foreground")}
                        onClick={() => onSortChange(c.sortKey!, active && sort!.dir === "desc" ? "asc" : "desc")}
                      >
                        {c.header}
                        {active ? (sort!.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ChevronsUpDown className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </TH>
                );
              })}
            </TR>
          </THead>
          <TBody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <TR key={i} className="hover:bg-transparent">
                    {columns.map((c) => (
                      <TD key={c.key}>
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </TD>
                    ))}
                  </TR>
                ))
              : rows?.map((row) => (
                  <TR key={rowKey(row)} data-clickable={!!onRowClick} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                    {columns.map((c) => (
                      <TD key={c.key} className={cn(c.align === "end" && "text-end", c.className)}>
                        {c.cell(row)}
                      </TD>
                    ))}
                  </TR>
                ))}
          </TBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="space-y-2 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-2/3" />
              </li>
            ))
          : rows?.map((row) => (
              <li key={rowKey(row)} className={cn("p-4", onRowClick && "cursor-pointer active:bg-accent/50")} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 font-medium">{titleCol.cell(row)}</div>
                  {actionCols.length > 0 && (
                    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {actionCols.map((c) => (
                        <span key={c.key}>{c.cell(row)}</span>
                      ))}
                    </div>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                  {bodyCols.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{c.header}</dt>
                      <dd className="truncate">{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
      </ul>

      {showEmpty && <EmptyState {...(empty ?? { title: "Nothing here yet" })} />}
      {pagination && !loading && <Pagination {...pagination} />}
    </div>
  );
}
