import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="scrollbar-thin w-full overflow-x-auto">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
);
export const THead = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className="border-b bg-muted/45 text-left" {...p} />;
export const TBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody className="[&_tr:last-child]:border-0" {...p} />;
export const TR = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b transition-colors data-[clickable=true]:cursor-pointer hover:bg-accent/45", className)} {...p} />
);
export const TH = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("h-10 whitespace-nowrap px-4 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground", className)} {...p} />
);
export const TD = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn("px-4 py-3 align-middle", className)} {...p} />;
