"use client";

import { CalendarDays } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { RANGE_LABELS, type RangePreset } from "@/lib/dates";

export interface RangeValue {
  range: RangePreset;
  from?: string;
  to?: string;
}

export function DateRangeFilter({ value, onChange }: { value: RangeValue; onChange: (v: RangeValue) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute z-10 start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Select
          aria-label="Date range"
          value={value.range}
          onChange={(e) => onChange({ range: e.target.value as RangePreset, from: value.from, to: value.to })}
          className="ps-9"
        >
          {(Object.keys(RANGE_LABELS) as RangePreset[]).map((k) => (
            <option key={k} value={k}>{RANGE_LABELS[k]}</option>
          ))}
        </Select>
      </div>
      {value.range === "custom" && (
        <>
          <Input type="date" aria-label="From date" value={value.from ?? ""} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} className="w-[9.5rem]" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" aria-label="To date" value={value.to ?? ""} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className="w-[9.5rem]" />
        </>
      )}
    </div>
  );
}
