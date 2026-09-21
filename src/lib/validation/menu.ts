import { z } from "zod";
import { id, minor } from "./common";

const nullableText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`).nullish();

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name").max(60),
  description: nullableText(300),
  imageUrl: z.string().max(500).nullish(),
  isActive: z.boolean(),
});

export const productOptionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["SIZE", "ADDON"]),
  name: z.string().trim().min(1, "Name required").max(60),
  priceDelta: z.number().int().min(-1_000_000).max(1_000_000),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a product name").max(100),
    description: nullableText(1000),
    categoryId: id,
    price: minor,
    discountPrice: minor.nullish(),
    imageUrl: z.string().max(500).nullish(),
    ingredients: z.array(z.string().trim().min(1).max(60)).max(40),
    allergens: z.array(z.string().trim().min(1).max(40)).max(20),
    prepTimeMinutes: z.number().int().min(1, "At least 1 minute").max(240),
    isAvailable: z.boolean(),
    isFeatured: z.boolean(),
    isPopular: z.boolean(),
    trackStock: z.boolean(),
    stock: z.number().int().min(0).max(100000).nullish(),
    lowStockThreshold: z.number().int().min(0).max(1000),
    options: z.array(productOptionSchema).max(30),
  })
  .superRefine((v, ctx) => {
    if (v.discountPrice != null && v.discountPrice >= v.price) {
      ctx.addIssue({ code: "custom", path: ["discountPrice"], message: "Discount price must be lower than the regular price" });
    }
    if (v.trackStock && v.stock == null) {
      ctx.addIssue({ code: "custom", path: ["stock"], message: "Enter the stock on hand" });
    }
    if (v.options.filter((o) => o.type === "SIZE" && o.isDefault).length > 1) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Only one size can be the default" });
    }
  });

export const reorderSchema = z.object({ ids: z.array(id).min(1).max(500) });

export const productListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  categoryId: id.optional(),
  availability: z.enum(["available", "unavailable"]).optional(),
  sort: z.enum(["name", "price", "sortOrder", "updatedAt"]).default("sortOrder"),
  dir: z.enum(["asc", "desc"]).default("asc"),
});

export type CategoryInput = z.output<typeof categorySchema>;
export type ProductInput = z.output<typeof productSchema>;
export type ProductFormValues = z.input<typeof productSchema>;
