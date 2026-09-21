"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1800); } catch {} }} className="inline-flex items-center gap-3 border border-dashed border-white/50 px-4 py-2.5 font-mono text-[13px] tracking-[0.18em] transition-colors hover:bg-white/10" aria-label={`Copy code ${code}`}>
      {code} {done ? <Check className="size-3.5" /> : <Copy className="size-3.5 opacity-70" />}
      <span className="sr-only" role="status">{done ? "Copied" : ""}</span>
    </button>
  );
}
