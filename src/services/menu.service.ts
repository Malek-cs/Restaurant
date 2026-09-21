import "server-only";
import { db } from "@/database/client";
import type { Prisma } from "@/generated/prisma/client";
import { cached, invalidate } from "@/lib/cache";
import { conflict, notFound } from "@/lib/api/errors";
import { slugify } from "@/utils/slug";
import type { CategoryInput, ProductInput } from "@/lib/validation/menu";

// ───────────────────────── DTOs ─────────────────────────

export interface ProductOptionDTO {
  id: string;
  type: "SIZE" | "ADDON";
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  ingredients: string[];
  allergens: string[];
  prepTimeMinutes: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  options: ProductOptionDTO[];
}

export interface PublicCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

type ProductWithRels = Prisma.ProductGetPayload<{ include: { category: true; options: true } }>;

function toPublicProduct(p: ProductWithRels): PublicProduct {
  const stockOut = p.trackStock && (p.stock ?? 0) <= 0;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: p.price,
    discountPrice: p.discountPrice,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    ingredients: p.ingredients,
    allergens: p.allergens,
    prepTimeMinutes: p.prepTimeMinutes,
    isAvailable: p.isAvailable && !stockOut,
    isFeatured: p.isFeatured,
    isPopular: p.isPopular,
    options: p.options
      .filter((o) => o.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({ id: o.id, type: o.type, name: o.name, priceDelta: o.priceDelta, isDefault: o.isDefault })),
  };
}

const publicInclude = { category: true, options: true } as const;

// ───────────────────────── Public reads ─────────────────────────

export async function getPublicMenu() {
  return cached("public-menu", ["menu"], 30_000, async () => {
    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { products: { orderBy: { sortOrder: "asc" }, include: publicInclude } },
    });
    const cats: PublicCategory[] = categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      imageUrl: c.imageUrl,
      productCount: c.products.length,
    }));
    const products = categories.flatMap((c) => c.products.map(toPublicProduct));
    return { categories: cats, products };
  });
}

export async function getPublicProduct(idOrSlug: string) {
  const p = await db.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], category: { isActive: true } },
    include: publicInclude,
  });
  if (!p) return null;
  const related = await db.product.findMany({
    where: { categoryId: p.categoryId, id: { not: p.id }, isAvailable: true },
    orderBy: [{ isPopular: "desc" }, { sortOrder: "asc" }],
    take: 3,
    include: publicInclude,
  });
  return { product: toPublicProduct(p), related: related.map(toPublicProduct) };
}

// ───────────────────────── Admin: categories ─────────────────────────

async function uniqueSlug(base: string, model: "category" | "product", excludeId?: string) {
  const root = slugify(base) || "item";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing =
      model === "category"
        ? await db.category.findUnique({ where: { slug } })
        : await db.product.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

export async function listCategoriesAdmin() {
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    productCount: c._count.products,
  }));
}

const nz = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export async function createCategory(input: CategoryInput) {
  const max = await db.category.aggregate({ _max: { sortOrder: true } });
  const c = await db.category.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.name, "category"),
      description: nz(input.description),
      imageUrl: nz(input.imageUrl),
      isActive: input.isActive,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  invalidate("menu");
  return c;
}

export async function updateCategory(id: string, input: CategoryInput) {
  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) throw notFound("Category");
  const c = await db.category.update({
    where: { id },
    data: {
      name: input.name,
      slug: existing.name === input.name ? existing.slug : await uniqueSlug(input.name, "category", id),
      description: nz(input.description),
      imageUrl: nz(input.imageUrl),
      isActive: input.isActive,
    },
  });
  invalidate("menu");
  return c;
}

export async function deleteCategory(id: string) {
  const c = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!c) throw notFound("Category");
  if (c._count.products > 0) {
    throw conflict(`"${c.name}" still has ${c._count.products} product${c._count.products === 1 ? "" : "s"}. Move or delete them first.`);
  }
  await db.category.delete({ where: { id } });
  invalidate("menu");
  return c;
}

export async function reorderCategories(ids: string[]) {
  await db.$transaction(ids.map((id, i) => db.category.update({ where: { id }, data: { sortOrder: i } })));
  invalidate("menu");
}

// ───────────────────────── Admin: products ─────────────────────────

export async function listProductsAdmin(q: {
  page: number;
  pageSize: number;
  q?: string;
  categoryId?: string;
  availability?: "available" | "unavailable";
  sort: "name" | "price" | "sortOrder" | "updatedAt";
  dir: "asc" | "desc";
}) {
  const where: Prisma.ProductWhereInput = {
    ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    ...(q.availability ? { isAvailable: q.availability === "available" } : {}),
    ...(q.q ? { OR: [{ name: { contains: q.q, mode: "insensitive" } }, { description: { contains: q.q, mode: "insensitive" } }] } : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    q.sort === "sortOrder" ? [{ category: { sortOrder: q.dir } }, { sortOrder: q.dir }] : [{ [q.sort]: q.dir }];
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { category: { select: { id: true, name: true } }, options: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  return { total, rows };
}

export async function getProductAdmin(id: string) {
  const p = await db.product.findUnique({ where: { id }, include: { options: { orderBy: { sortOrder: "asc" } } } });
  if (!p) throw notFound("Product");
  return p;
}

async function assertCategory(id: string) {
  const c = await db.category.findUnique({ where: { id } });
  if (!c) throw conflict("Choose a valid category.", { categoryId: "Choose a valid category" });
}

export async function createProduct(input: ProductInput) {
  await assertCategory(input.categoryId);
  const max = await db.product.aggregate({ where: { categoryId: input.categoryId }, _max: { sortOrder: true } });
  const p = await db.product.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.name, "product"),
      description: nz(input.description),
      price: input.price,
      discountPrice: input.discountPrice ?? null,
      imageUrl: nz(input.imageUrl),
      categoryId: input.categoryId,
      ingredients: input.ingredients,
      allergens: input.allergens,
      prepTimeMinutes: input.prepTimeMinutes,
      isAvailable: input.isAvailable,
      isFeatured: input.isFeatured,
      isPopular: input.isPopular,
      trackStock: input.trackStock,
      stock: input.trackStock ? (input.stock ?? 0) : null,
      lowStockThreshold: input.lowStockThreshold,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      options: {
        create: input.options.map((o, i) => ({
          type: o.type,
          name: o.name,
          priceDelta: o.priceDelta,
          isDefault: o.isDefault,
          isActive: o.isActive,
          sortOrder: i,
        })),
      },
    },
  });
  invalidate("menu");
  return p;
}

export async function updateProduct(id: string, input: ProductInput) {
  const existing = await db.product.findUnique({ where: { id }, include: { options: true } });
  if (!existing) throw notFound("Product");
  await assertCategory(input.categoryId);

  const keepIds = input.options.filter((o) => o.id).map((o) => o.id!);
  const p = await db.$transaction(async (tx) => {
    await tx.productOption.deleteMany({ where: { productId: id, id: { notIn: keepIds } } });
    for (const [i, o] of input.options.entries()) {
      const data = { type: o.type, name: o.name, priceDelta: o.priceDelta, isDefault: o.isDefault, isActive: o.isActive, sortOrder: i };
      if (o.id && existing.options.some((eo) => eo.id === o.id)) {
        await tx.productOption.update({ where: { id: o.id }, data });
      } else {
        await tx.productOption.create({ data: { ...data, productId: id } });
      }
    }
    return tx.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: existing.name === input.name ? existing.slug : await uniqueSlug(input.name, "product", id),
        description: nz(input.description),
        price: input.price,
        discountPrice: input.discountPrice ?? null,
        imageUrl: nz(input.imageUrl),
        categoryId: input.categoryId,
        ingredients: input.ingredients,
        allergens: input.allergens,
        prepTimeMinutes: input.prepTimeMinutes,
        isAvailable: input.isAvailable,
        isFeatured: input.isFeatured,
        isPopular: input.isPopular,
        trackStock: input.trackStock,
        stock: input.trackStock ? (input.stock ?? 0) : null,
        lowStockThreshold: input.lowStockThreshold,
      },
    });
  });
  invalidate("menu");
  return p;
}

export async function setProductFlags(id: string, data: { isAvailable?: boolean; isFeatured?: boolean; isPopular?: boolean }) {
  const p = await db.product.update({ where: { id }, data });
  invalidate("menu");
  return p;
}

export async function duplicateProduct(id: string) {
  const src = await db.product.findUnique({ where: { id }, include: { options: true } });
  if (!src) throw notFound("Product");
  const name = `${src.name} (copy)`;
  const max = await db.product.aggregate({ where: { categoryId: src.categoryId }, _max: { sortOrder: true } });
  const p = await db.product.create({
    data: {
      name,
      slug: await uniqueSlug(name, "product"),
      description: src.description,
      price: src.price,
      discountPrice: src.discountPrice,
      imageUrl: src.imageUrl,
      categoryId: src.categoryId,
      ingredients: src.ingredients,
      allergens: src.allergens,
      prepTimeMinutes: src.prepTimeMinutes,
      isAvailable: false, // copies start hidden until reviewed
      isFeatured: false,
      isPopular: false,
      trackStock: src.trackStock,
      stock: src.stock,
      lowStockThreshold: src.lowStockThreshold,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      options: {
        create: src.options.map((o) => ({
          type: o.type,
          name: o.name,
          priceDelta: o.priceDelta,
          isDefault: o.isDefault,
          isActive: o.isActive,
          sortOrder: o.sortOrder,
        })),
      },
    },
  });
  invalidate("menu");
  return p;
}

export async function deleteProduct(id: string) {
  const p = await db.product.findUnique({ where: { id } });
  if (!p) throw notFound("Product");
  // Order history keeps a snapshot of name and price, so deleting is safe.
  await db.product.delete({ where: { id } });
  invalidate("menu");
  return p;
}

export async function reorderProducts(ids: string[]) {
  await db.$transaction(ids.map((pid, i) => db.product.update({ where: { id: pid }, data: { sortOrder: i } })));
  invalidate("menu");
}
