"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function TagInput({ value, onChange, placeholder, suggestions, id, max = 40 }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[]; id?: string; max?: number }) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = raw.trim();
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase()) || value.length >= max) return;
    onChange([...value, t]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[13px]">
            {t}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`} className="rounded text-muted-foreground hover:text-foreground">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8ch] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      {suggestions && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className={cn("rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground")}>
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
