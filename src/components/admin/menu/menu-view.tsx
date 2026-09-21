"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Copy, MoreHorizontal, Pencil, Plus, Trash2, UtensilsCrossed, Flame, Sparkles, X, Check } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUrlState } from "@/hooks/use-url-state";
import type { CategoryRow, ProductList, ProductRow } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { ProductImage } from "@/components/shared/product-image";
import { SortableList } from "@/components/shared/sortable-list";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { ProductForm } from "@/components/admin/menu/product-form";
import { Skeleton } from "@/components/ui/skeleton";

export function MenuView({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { money } = useFormat();
  const confirm = useConfirm();
  const [f, set] = useUrlState({ q: "", categoryId: "", availability: "", sort: "sortOrder", dir: "asc", page: "1" });
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [reorder, setReorder] = useState(false);

  useEffect(() => {
    if (sp.get("new") === "1" && canManage) { setEditing("new"); router.replace("/admin/menu"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cats = useApiQuery<CategoryRow[]>("/api/admin/categories");
  const params = { page: Number(f.page), pageSize: reorder ? 100 : 12, q: f.q, categoryId: f.categoryId, availability: f.availability, sort: reorder ? "sortOrder" : f.sort, dir: reorder ? "asc" : f.dir };
  const { data, isLoading, error, refetch } = useApiQuery<ProductList>("/api/admin/products", params, { placeholderData: (p) => p });
  const inv = ["/api/admin/products", "/api/admin/categories"];

  const flag = useApiMutation((v: { id: string; patch: Partial<Pick<ProductRow, "isAvailable" | "isFeatured" | "isPopular">> }) => api.patch(`/api/admin/products/${v.id}`, v.patch), { invalidate: inv });
  const duplicate = useApiMutation((id: string) => api.post<{ id: string }>(`/api/admin/products/${id}/duplicate`), { invalidate: inv, success: "Duplicated. The copy is hidden until you enable it." });
  const remove = useApiMutation((id: string) => api.del(`/api/admin/products/${id}`), { invalidate: inv, success: "Dish deleted." });
  const reorderM = useApiMutation((ids: string[]) => api.post("/api/admin/products/reorder", { ids }), { invalidate: inv, success: "Order saved." });

  async function onDelete(p: ProductRow) {
    const r = await confirm({ title: `Delete “${p.name}”?`, description: "It disappears from the website. Past orders keep their record of this dish.", confirmLabel: "Delete dish", destructive: true });
    if (r.confirmed) remove.mutate(p.id);
  }

  const rowActions = (p: ProductRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => setEditing(p)}><Pencil /> Edit</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => duplicate.mutate(p.id)}><Copy /> Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onDelete(p)}><Trash2 /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: Column<ProductRow>[] = [
    { key: "name", header: "Dish", sortKey: "name", mobile: "title", cell: (p) => (
      <div className="flex min-w-0 items-center gap-3">
        <ProductImage src={p.imageUrl} alt={p.name} className="size-11 shrink-0 rounded-md" sizes="44px" />
        <div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="truncate text-xs text-muted-foreground">{p.category.name}</p></div>
      </div>) },
    { key: "price", header: "Price", sortKey: "price", cell: (p) => (
      <div className="tabular">{p.discountPrice != null ? (<><span className="font-medium">{money(p.discountPrice)}</span> <span className="text-xs text-muted-foreground line-through">{money(p.price)}</span></>) : <span className="font-medium">{money(p.price)}</span>}</div>) },
    { key: "tags", header: "Tags", mobile: "hide", cell: (p) => (
      <div className="flex flex-wrap gap-1">{p.isFeatured && <Badge tone="amber"><Sparkles className="size-3" /> Featured</Badge>}{p.isPopular && <Badge tone="orange"><Flame className="size-3" /> Popular</Badge>}{p.options.length > 0 && <Badge tone="gray">{p.options.length} {p.options.length === 1 ? "option" : "options"}</Badge>}{!p.isFeatured && !p.isPopular && p.options.length === 0 && <span className="text-muted-foreground">—</span>}</div>) },
    { key: "stock", header: "Stock", className: "hidden xl:table-cell", mobile: "hide", cell: (p) => !p.trackStock ? <span className="text-muted-foreground">Not tracked</span> : <span className={p.stock != null && p.stock <= p.lowStockThreshold ? "font-medium text-[var(--tone-red-fg)]" : "tabular"}>{p.stock} left</span> },
    { key: "available", header: "Available", cell: (p) => canManage ? <Switch checked={p.isAvailable} onCheckedChange={(v) => flag.mutate({ id: p.id, patch: { isAvailable: v } })} aria-label={`${p.name} available`} /> : <Badge tone={p.isAvailable ? "green" : "gray"}>{p.isAvailable ? "Yes" : "No"}</Badge> },
    ...(canManage ? [{ key: "actions", header: <span className="sr-only">Actions</span>, align: "end" as const, mobile: "action" as const, cell: rowActions }] : []),
  ];

  const canReorder = canManage && !!f.categoryId;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Menu"
        description="Everything on your website menu. Changes go live immediately."
        actions={canManage && <Button onClick={() => setEditing("new")}><Plus /> Add dish</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-3 sm:p-4">
          <SearchInput value={f.q} onChange={(q) => set({ q })} placeholder="Search dishes" className="w-full sm:w-64" />
          <Select aria-label="Category" value={f.categoryId} onChange={(e) => { set({ categoryId: e.target.value }); setReorder(false); }} className="w-auto"><option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select aria-label="Availability" value={f.availability} onChange={(e) => set({ availability: e.target.value })} className="w-auto"><option value="">Any availability</option><option value="available">Available</option><option value="unavailable">Unavailable</option></Select>
          {(f.q || f.categoryId || f.availability) && <Button variant="ghost" size="sm" onClick={() => { set({ q: "", categoryId: "", availability: "" }); setReorder(false); }}><X /> Clear</Button>}
          {canReorder && <Button variant={reorder ? "default" : "outline"} size="sm" className="ms-auto" onClick={() => setReorder((r) => !r)}>{reorder ? <><Check /> Done</> : <><ArrowUpDown /> Reorder</>}</Button>}
        </div>

        {reorder ? (
          isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div> : (
            <>
              <p className="border-b bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">Drag the handle (or focus it and use the arrow keys) to change the order guests see. Saved automatically.</p>
              <SortableList items={data?.rows ?? []} onReorder={(ids) => reorderM.mutate(ids)} render={(p) => (
                <div className="flex items-center gap-3 py-2 pe-3"><ProductImage src={p.imageUrl} alt={p.name} className="size-10 shrink-0 rounded-md" sizes="40px" /><span className="truncate text-[13.5px] font-medium">{p.name}</span><span className="tabular ms-auto text-[13px] text-muted-foreground">{money(p.discountPrice ?? p.price)}</span></div>
              )} />
            </>
          )
        ) : (
          <DataTable
            columns={columns}
            rows={data?.rows}
            rowKey={(p) => p.id}
            loading={isLoading}
            error={error?.message}
            onRetry={() => refetch()}
            sort={{ key: f.sort, dir: f.dir as "asc" | "desc" }}
            onSortChange={(sort, dir) => set({ sort, dir })}
            onRowClick={canManage ? (p) => setEditing(p) : undefined}
            pagination={data ? { page: Number(f.page), pageSize: 12, total: data.total, onPageChange: (p) => set({ page: p }, { resetPage: false }) } : undefined}
            empty={{ icon: UtensilsCrossed, title: f.q || f.categoryId || f.availability ? "No dishes match" : "Your menu is empty", description: f.q || f.categoryId || f.availability ? "Try clearing your filters." : "Add your first dish to show it on the website.", action: canManage && !f.q ? <Button onClick={() => setEditing("new")}><Plus /> Add dish</Button> : undefined }}
          />
        )}
      </Card>
      {editing && <ProductForm key={editing === "new" ? "new" : editing.id} product={editing === "new" ? null : editing} categories={cats.data ?? []} defaultCategoryId={f.categoryId} onClose={() => setEditing(null)} />}
    </div>
  );
}
