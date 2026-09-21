"use client";

import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { productSchema, type ProductFormValues } from "@/lib/validation/menu";
import { api } from "@/lib/api/client";
import { useApiMutation } from "@/hooks/use-api";
import type { CategoryRow, ProductRow } from "@/types/api";
import { FormSurface } from "@/components/shared/form-surface";
import { Field, applyServerErrors } from "@/components/shared/field";
import { MoneyInput } from "@/components/shared/money-input";
import { TagInput } from "@/components/shared/tag-input";
import { ImageUpload } from "@/components/shared/image-upload";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const ALLERGENS = ["Gluten", "Dairy", "Egg", "Nuts", "Sesame", "Soy", "Fish", "Shellfish"];

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
      <span><span className="block text-[13px] font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

export function ProductForm({ product, categories, defaultCategoryId, onClose }: { product: ProductRow | null; categories: CategoryRow[]; defaultCategoryId?: string; onClose: () => void }) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name, description: product.description ?? "", categoryId: product.categoryId, price: product.price, discountPrice: product.discountPrice, imageUrl: product.imageUrl,
          ingredients: product.ingredients, allergens: product.allergens, prepTimeMinutes: product.prepTimeMinutes, isAvailable: product.isAvailable, isFeatured: product.isFeatured, isPopular: product.isPopular,
          trackStock: product.trackStock, stock: product.stock, lowStockThreshold: product.lowStockThreshold,
          options: product.options.map((o) => ({ id: o.id, type: o.type, name: o.name, priceDelta: o.priceDelta, isDefault: o.isDefault, isActive: o.isActive })),
        }
      : { name: "", description: "", categoryId: defaultCategoryId || categories[0]?.id || "", price: 0, discountPrice: null, imageUrl: null, ingredients: [], allergens: [], prepTimeMinutes: 15, isAvailable: true, isFeatured: false, isPopular: false, trackStock: false, stock: null, lowStockThreshold: 5, options: [] },
  });
  const { register, control, watch, formState: { errors, isDirty } } = form;
  const options = useFieldArray({ control, name: "options" });
  const trackStock = watch("trackStock");

  const save = useApiMutation(
    (v: ProductFormValues) => (product ? api.put(`/api/admin/products/${product.id}`, v) : api.post("/api/admin/products", v)),
    { invalidate: ["/api/admin/products", "/api/admin/categories"], success: product ? "Dish updated." : "Dish added.", onSuccess: onClose, onError: (e) => applyServerErrors(form, e) },
  );

  const optionErr = (i: number, k: "name" | "priceDelta") => errors.options?.[i]?.[k]?.message;

  return (
    <FormSurface open onClose={onClose} variant="sheet" sheetWidth="max-w-2xl" title={product ? `Edit ${product.name}` : "Add a dish"} description="Shown on your website menu and product page." dirty={isDirty} submitting={save.isPending} submitLabel={product ? "Save changes" : "Add dish"} onSubmit={form.handleSubmit((v) => save.mutate(v))}>
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <Controller control={control} name="imageUrl" render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} aspect="aspect-square" name={watch("name") || "Dish"} />} />
          <div className="space-y-4">
            <Field label="Name" htmlFor="p-name" required error={errors.name?.message}><Input id="p-name" autoFocus aria-invalid={!!errors.name} {...register("name")} /></Field>
            <Field label="Category" htmlFor="p-cat" required error={errors.categoryId?.message}><Select id="p-cat" aria-invalid={!!errors.categoryId} {...register("categoryId")}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          </div>
        </div>

        <Field label="Description" htmlFor="p-desc" error={errors.description?.message}><Textarea id="p-desc" rows={3} placeholder="What makes it special?" {...register("description")} /></Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price" htmlFor="p-price" required error={errors.price?.message}><Controller control={control} name="price" render={({ field }) => <MoneyInput id="p-price" value={field.value} onChange={(v) => field.onChange(v ?? 0)} invalid={!!errors.price} />} /></Field>
          <Field label="Discount price" htmlFor="p-disc" error={errors.discountPrice?.message} hint="Optional"><Controller control={control} name="discountPrice" render={({ field }) => <MoneyInput id="p-disc" value={field.value} onChange={field.onChange} invalid={!!errors.discountPrice} />} /></Field>
          <Field label="Prep time (min)" htmlFor="p-prep" error={errors.prepTimeMinutes?.message}><Input id="p-prep" type="number" min={1} inputMode="numeric" className="tabular" {...register("prepTimeMinutes", { valueAsNumber: true })} /></Field>
        </div>

        <Field label="Ingredients" htmlFor="p-ing" hint="Press Enter or comma after each one"><Controller control={control} name="ingredients" render={({ field }) => <TagInput id="p-ing" value={field.value} onChange={field.onChange} placeholder="e.g. Tahini" />} /></Field>
        <Field label="Allergens"><Controller control={control} name="allergens" render={({ field }) => <TagInput value={field.value} onChange={field.onChange} placeholder="Add allergen" suggestions={ALLERGENS} />} /></Field>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div><h3 className="text-sm font-semibold">Sizes &amp; add-ons</h3><p className="text-xs text-muted-foreground">Size prices are added to the base price. Guests choose one size, any add-ons.</p></div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => options.append({ type: "SIZE", name: "", priceDelta: 0, isDefault: options.fields.every((f) => f.type !== "SIZE"), isActive: true })}><Plus /> Size</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => options.append({ type: "ADDON", name: "", priceDelta: 0, isDefault: false, isActive: true })}><Plus /> Add-on</Button>
            </div>
          </div>
          {typeof errors.options?.message === "string" && <p role="alert" className="text-xs text-destructive">{errors.options.message}</p>}
          {options.fields.length > 0 && (
            <ul className="space-y-2">
              {options.fields.map((f, i) => (
                <li key={f.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-3 sm:grid-cols-[5.5rem_1fr_9rem_auto]">
                  <span className="col-span-2 self-center text-xs font-medium uppercase tracking-wide text-muted-foreground sm:col-span-1">{f.type === "SIZE" ? "Size" : "Add-on"}</span>
                  <div className="col-span-2 sm:col-span-1"><Input aria-label="Option name" placeholder={f.type === "SIZE" ? "e.g. Large" : "e.g. Extra cheese"} aria-invalid={!!optionErr(i, "name")} {...register(`options.${i}.name`)} />{optionErr(i, "name") && <p className="mt-1 text-xs text-destructive">{optionErr(i, "name")}</p>}</div>
                  <Controller control={control} name={`options.${i}.priceDelta`} render={({ field }) => <MoneyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} allowNegative />} />
                  <div className="flex items-center gap-2 justify-self-end">
                    {f.type === "SIZE" && <Controller control={control} name={`options.${i}.isDefault`} render={({ field }) => (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={field.value} onChange={(e) => { options.fields.forEach((_, j) => form.setValue(`options.${j}.isDefault`, j === i ? e.target.checked : (form.getValues(`options.${j}.type`) === "SIZE" ? false : form.getValues(`options.${j}.isDefault`)), { shouldDirty: true })); }} className="accent-[var(--primary)]" /> Default</label>
                    )} />}
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove option" onClick={() => options.remove(i)}><Trash2 /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Visibility</h3>
          <Controller control={control} name="isAvailable" render={({ field }) => <Toggle label="Available to order" hint="Turn off to show it as sold out" checked={field.value} onChange={field.onChange} />} />
          <Controller control={control} name="isFeatured" render={({ field }) => <Toggle label="Featured" hint="Shown in “Culinary highlights” on the homepage" checked={field.value} onChange={field.onChange} />} />
          <Controller control={control} name="isPopular" render={({ field }) => <Toggle label="Popular" hint="Shown in “Guest favourites”" checked={field.value} onChange={field.onChange} />} />
          <Controller control={control} name="trackStock" render={({ field }) => <Toggle label="Track stock" hint="Sells out automatically and alerts you when low" checked={field.value} onChange={field.onChange} />} />
          {trackStock && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="In stock" htmlFor="p-stock" error={errors.stock?.message}><Input id="p-stock" type="number" min={0} inputMode="numeric" className="tabular" {...register("stock", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} /></Field>
              <Field label="Low-stock alert at" htmlFor="p-low"><Input id="p-low" type="number" min={0} inputMode="numeric" className="tabular" {...register("lowStockThreshold", { valueAsNumber: true })} /></Field>
            </div>
          )}
        </section>
      </div>
    </FormSurface>
  );
}
