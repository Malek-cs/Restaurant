"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { categorySchema } from "@/lib/validation/menu";
import type { z } from "zod";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import type { CategoryRow } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableList } from "@/components/shared/sortable-list";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { FormSurface } from "@/components/shared/form-surface";
import { Field, applyServerErrors } from "@/components/shared/field";
import { ImageUpload } from "@/components/shared/image-upload";
import { ProductImage } from "@/components/shared/product-image";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { useQueryClient } from "@tanstack/react-query";

type Values = z.input<typeof categorySchema>;

function CategoryForm({ category, onClose }: { category: CategoryRow | null; onClose: () => void }) {
  const form = useForm<Values>({ resolver: zodResolver(categorySchema), defaultValues: { name: category?.name ?? "", description: category?.description ?? "", imageUrl: category?.imageUrl ?? null, isActive: category?.isActive ?? true } });
  const { register, control, formState: { errors, isDirty } } = form;
  const save = useApiMutation((v: Values) => (category ? api.put(`/api/admin/categories/${category.id}`, v) : api.post("/api/admin/categories", v)), {
    invalidate: ["/api/admin/categories", "/api/admin/products"], success: category ? "Category updated." : "Category created.", onSuccess: onClose, onError: (e) => applyServerErrors(form, e),
  });
  return (
    <FormSurface open onClose={onClose} title={category ? "Edit category" : "New category"} dirty={isDirty} submitting={save.isPending} onSubmit={form.handleSubmit((v) => save.mutate(v))}>
      <div className="space-y-4">
        <Field label="Name" htmlFor="c-name" required error={errors.name?.message}><Input id="c-name" autoFocus aria-invalid={!!errors.name} {...register("name")} /></Field>
        <Field label="Description" htmlFor="c-desc" error={errors.description?.message} hint="Shown under the category name on the menu"><Textarea id="c-desc" rows={2} {...register("description")} /></Field>
        <Field label="Cover image" hint="Used for the category tiles on the homepage"><Controller control={control} name="imageUrl" render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} aspect="aspect-[16/9]" name="Category" />} /></Field>
        <Controller control={control} name="isActive" render={({ field }) => (
          <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5"><span><span className="block text-[13px] font-medium">Visible on website</span><span className="block text-xs text-muted-foreground">Hidden categories also hide their dishes.</span></span><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Visible on website" /></label>
        )} />
      </div>
    </FormSurface>
  );
}

export function CategoriesView() {
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const { data, isLoading, error, refetch } = useApiQuery<CategoryRow[]>("/api/admin/categories");
  const inv = ["/api/admin/categories", "/api/admin/products"];

  const toggle = useApiMutation((c: CategoryRow) => api.put(`/api/admin/categories/${c.id}`, { name: c.name, description: c.description, imageUrl: c.imageUrl, isActive: !c.isActive }), { invalidate: inv });
  const remove = useApiMutation((id: string) => api.del(`/api/admin/categories/${id}`), { invalidate: inv, success: "Category deleted." });
  const reorder = useApiMutation((ids: string[]) => api.post("/api/admin/categories/reorder", { ids }), {
    invalidate: inv, success: "Order saved.",
    onError: () => { qc.invalidateQueries({ queryKey: ["/api/admin/categories"] }); },
  });

  async function onDelete(c: CategoryRow) {
    const r = await confirm({ title: `Delete “${c.name}”?`, description: c.productCount ? `It still has ${c.productCount} dishes — move or delete those first.` : "This can't be undone.", confirmLabel: "Delete category", destructive: true });
    if (r.confirmed) remove.mutate(c.id);
  }

  function onReorder(ids: string[]) {
    // optimistic: reorder cache immediately, roll back on failure
    qc.setQueriesData<CategoryRow[]>({ queryKey: ["/api/admin/categories"] }, (old) => old && ids.map((id) => old.find((c) => c.id === id)!).filter(Boolean));
    reorder.mutate(ids);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Categories" description="Group your dishes. Drag to change the order they appear on the menu." actions={<Button onClick={() => setEditing("new")}><Plus /> New category</Button>} />
      <Card>
        {error ? <ErrorState message={error.message} onRetry={() => refetch()} /> : isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : data && data.length === 0 ? (
          <EmptyState icon={Tags} title="No categories yet" description="Create categories like Appetizers, Mains or Desserts." action={<Button onClick={() => setEditing("new")}><Plus /> New category</Button>} />
        ) : (
          <SortableList
            items={data ?? []}
            onReorder={onReorder}
            render={(c) => (
              <div className="flex items-center gap-3 py-3 pe-3">
                <ProductImage src={c.imageUrl} alt={c.name} className="size-12 shrink-0 rounded-md" sizes="48px" />
                <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.productCount} {c.productCount === 1 ? "dish" : "dishes"}{c.description ? ` · ${c.description}` : ""}</p></div>
                {!c.isActive && <Badge tone="gray" className="hidden sm:inline-flex">Hidden</Badge>}
                <Switch checked={c.isActive} onCheckedChange={() => toggle.mutate(c)} aria-label={`${c.name} visible`} />
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onDelete(c)} aria-label={`Delete ${c.name}`}><Trash2 /></Button>
              </div>
            )}
          />
        )}
      </Card>
      {editing && <CategoryForm key={editing === "new" ? "new" : editing.id} category={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
