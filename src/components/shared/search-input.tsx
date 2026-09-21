"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

/** Debounced search box that reports changes upstream (usually to URL state). */
export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounce(local, 300);

  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} className="ps-9 pe-8" aria-label={placeholder} />
      {local && (
        <button type="button" onClick={() => setLocal("")} className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
