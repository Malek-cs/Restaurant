"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { PublicCategory, PublicProduct } from "@/services/menu.service";
import { DishCard } from "@/components/site/dish-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

const ALLERGENS = ["Gluten", "Dairy", "Egg", "Nuts", "Sesame"];

export function MenuBrowser({ categories, products }: { categories: PublicCategory[]; products: PublicProduct[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const active = sp.get("category") ?? "";
  const [q, setQ] = useState("");
  const [avoid, setAvoid] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setCategory = (slug: string) => router.replace(slug ? `/menu?category=${slug}` : "/menu", { scroll: false });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      if (active && categories.find((c) => c.id === p.categoryId)?.slug !== active) return false;
      if (term && !`${p.name} ${p.description ?? ""} ${p.ingredients.join(" ")}`.toLowerCase().includes(term)) return false;
      if (avoid.length && p.allergens.some((a) => avoid.includes(a))) return false;
      return true;
    });
  }, [products, categories, active, q, avoid]);

  const groups = categories.map((c) => ({ c, items: filtered.filter((p) => p.categoryId === c.id) })).filter((g) => g.items.length);
  const chip = (on: boolean) => cn("shrink-0 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors", on ? "border-foreground bg-foreground text-background" : "bg-transparent opacity-80 hover:opacity-100");

  return (
    <div className="mt-10">
      <div className="sticky top-[86px] z-20 -mx-[22px] border-b bg-background/95 px-[22px] py-3 backdrop-blur md:-mx-[7vw] md:px-[7vw]">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
          <nav className="no-scrollbar -mx-1 flex flex-1 gap-2 overflow-x-auto px-1" aria-label="Menu categories">
            <button onClick={() => setCategory("")} className={chip(!active)} aria-pressed={!active}>All</button>
            {categories.map((c) => <button key={c.id} onClick={() => setCategory(c.slug)} className={chip(active === c.slug)} aria-pressed={active === c.slug}>{c.name}</button>)}
          </nav>
          <button onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} className={cn("hidden shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.12em] sm:inline-flex", (filtersOpen || avoid.length) && "border-foreground")}><SlidersHorizontal className="size-3.5" /> Filter{avoid.length > 0 && ` (${avoid.length})`}</button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes or ingredients" aria-label="Search the menu" className="h-11 w-full rounded-full border bg-transparent ps-11 pe-10 text-[14px] font-light outline-none transition-colors placeholder:opacity-50 focus:border-foreground" />
          {q && <button onClick={() => setQ("")} className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 opacity-60 hover:opacity-100" aria-label="Clear search"><X className="size-4" /></button>}
        </div>
        <div className={cn("flex-wrap items-center gap-2", filtersOpen || avoid.length ? "flex" : "flex sm:hidden")}>
          <span className="text-[11px] uppercase tracking-[0.14em] opacity-60">Avoid</span>
          {ALLERGENS.map((a) => <button key={a} onClick={() => setAvoid((c) => (c.includes(a) ? c.filter((x) => x !== a) : [...c, a]))} aria-pressed={avoid.includes(a)} className={cn("rounded-full border px-3 py-1 text-[12px] transition-colors", avoid.includes(a) ? "border-foreground bg-foreground text-background" : "opacity-80 hover:opacity-100")}>{a}</button>)}
          {avoid.length > 0 && <button onClick={() => setAvoid([])} className="text-[12px] underline opacity-70">Clear</button>}
        </div>
        {avoid.length > 0 && <p className="text-[12px] text-muted-foreground">Filters use the allergens listed by our kitchen. If you have a serious allergy, please tell us when you order.</p>}
      </div>

      <div className="mt-10 space-y-16" aria-live="polite">
        {groups.length === 0 ? (
          <EmptyState title="No dishes match" description="Try a different search or remove a filter." action={<button onClick={() => { setQ(""); setAvoid([]); setCategory(""); }} className="text-sm underline">Reset filters</button>} />
        ) : groups.map(({ c, items }) => (
          <section key={c.id} aria-labelledby={`cat-${c.slug}`}>
            <div className="mb-6 flex items-end justify-between gap-4 border-b pb-3">
              <div><h2 id={`cat-${c.slug}`} className="font-display text-[34px] font-normal tracking-[0.03em]">{c.name}</h2>{c.description && <p className="mt-1 text-[13px] font-light text-muted-foreground">{c.description}</p>}</div>
              <span className="tabular text-[11px] uppercase tracking-[0.14em] opacity-50">{items.length} {items.length === 1 ? "dish" : "dishes"}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-3 lg:gap-x-7 xl:grid-cols-4">{items.map((p) => <DishCard key={p.id} p={p} />)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
