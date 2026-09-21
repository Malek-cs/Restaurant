"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { currencyDigits, minorToInput, toMinor } from "@/utils/money";
import { useFormat } from "@/hooks/use-restaurant";
import { cn } from "@/lib/utils";

/** Edits an amount in major units ("12.500") while the form value stays an integer in minor units (12500). */
export function MoneyInput({ value, onChange, id, invalid, placeholder, allowNegative, className, disabled }: { value: number | null | undefined; onChange: (v: number | null) => void; id?: string; invalid?: boolean; placeholder?: string; allowNegative?: boolean; className?: string; disabled?: boolean }) {
  const { restaurant } = useFormat();
  const digits = currencyDigits(restaurant.currency);
  const [text, setText] = useState(() => (value == null ? "" : minorToInput(value, restaurant.currency)));

  useEffect(() => {
    const parsed = text === "" || text === "-" ? null : toMinorSigned(text, restaurant.currency);
    if (parsed !== (value ?? null)) setText(value == null ? "" : minorToInput(value, restaurant.currency));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">{restaurant.currency}</span>
      <Input
        id={id}
        inputMode="decimal"
        aria-invalid={invalid}
        disabled={disabled}
        placeholder={placeholder ?? (0).toFixed(digits)}
        className={cn("ps-12 tabular", className)}
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, ".");
          const re = new RegExp(`^${allowNegative ? "-?" : ""}\\d*(\\.\\d{0,${digits}})?$`);
          if (!re.test(raw)) return;
          setText(raw);
          onChange(raw === "" || raw === "-" ? null : toMinorSigned(raw, restaurant.currency));
        }}
        onBlur={() => {
          if (value != null) setText(minorToInput(value, restaurant.currency));
        }}
      />
    </div>
  );
}

function toMinorSigned(s: string, currency: string) {
  if (s.startsWith("-")) {
    const m = toMinor(s.slice(1), currency);
    return m == null ? null : -m;
  }
  return toMinor(s, currency);
}
