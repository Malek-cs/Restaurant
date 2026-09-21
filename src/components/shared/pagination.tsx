"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-[13px] sm:flex-row">
      <p className="text-muted-foreground tabular">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of <span className="font-medium text-foreground">{total}</span>
      </p>
      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="px-1.5 text-muted-foreground">…</span>
            ) : (
              <Button key={n} variant={n === page ? "default" : "ghost"} size="icon-sm" onClick={() => onPageChange(n)} aria-current={n === page ? "page" : undefined} className="tabular">
                {n}
              </Button>
            ),
          )}
          <Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </nav>
      )}
    </div>
  );
}
