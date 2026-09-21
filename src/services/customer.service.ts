import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/database/client";
import { notFound } from "@/lib/api/errors";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  orders: number;
  spent: number;
  lastOrderAt: Date | null;
}

const SORTS = {
  name: Prisma.raw(`c."name"`),
  orders: Prisma.raw(`orders`),
  spent: Prisma.raw(`spent`),
  lastOrder: Prisma.raw(`"lastOrderAt"`),
  createdAt: Prisma.raw(`c."createdAt"`),
} as const;

export async function listCustomers(q: {
  page: number;
  pageSize: number;
  q?: string;
  sort: keyof typeof SORTS;
  dir: "asc" | "desc";
  all?: boolean;
}) {
  const term = q.q ? `%${q.q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const where = term
    ? Prisma.sql`WHERE (c."name" ILIKE ${term} OR c."phone" ILIKE ${term} OR c."email" ILIKE ${term})`
    : Prisma.empty;
  const dir = q.dir === "asc" ? Prisma.raw("ASC") : Prisma.raw("DESC");
  const limit = q.all ? Prisma.sql`LIMIT 5000` : Prisma.sql`LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`;

  const [rows, count] = await Promise.all([
    db.$queryRaw<CustomerRow[]>(Prisma.sql`
      SELECT c.id, c."name", c."phone", c."email", c."createdAt",
        COUNT(o.id) FILTER (WHERE o."status" <> 'CANCELLED')::int AS orders,
        COALESCE(SUM(o."total") FILTER (WHERE o."status" <> 'CANCELLED'), 0)::float8 AS spent,
        MAX(o."placedAt") AS "lastOrderAt"
      FROM "Customer" c
      LEFT JOIN "Order" o ON o."customerId" = c.id
      ${where}
      GROUP BY c.id
      ORDER BY ${SORTS[q.sort]} ${dir} NULLS LAST, c.id
      ${limit}`),
    db.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS n FROM "Customer" c ${where}`),
  ]);
  return { total: count[0]?.n ?? 0, rows };
}

export async function getCustomerProfile(id: string) {
  const customer = await db.customer.findUnique({ where: { id }, include: { reviews: { orderBy: { createdAt: "desc" }, take: 5 } } });
  if (!customer) throw notFound("Customer");

  const [agg, favorites, recent, firstLast] = await Promise.all([
    db.order.aggregate({
      where: { customerId: id, status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { total: true },
      _avg: { total: true },
    }),
    db.orderItem.groupBy({
      by: ["productName"],
      where: { order: { customerId: id, status: { not: "CANCELLED" } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    db.order.findMany({
      where: { customerId: id },
      orderBy: { placedAt: "desc" },
      take: 25,
      include: { payment: { select: { status: true, method: true } }, _count: { select: { items: true } } },
    }),
    db.order.aggregate({ where: { customerId: id, status: { not: "CANCELLED" } }, _max: { placedAt: true } }),
  ]);

  return {
    customer,
    stats: {
      orders: agg._count._all,
      spent: agg._sum.total ?? 0,
      averageOrder: Math.round(agg._avg.total ?? 0),
      lastOrderAt: firstLast._max.placedAt,
    },
    favorites: favorites.map((f) => ({ name: f.productName, quantity: f._sum.quantity ?? 0 })),
    orders: recent,
  };
}

export async function updateCustomer(id: string, input: { name?: string; email?: string | null; notes?: string | null }) {
  const c = await db.customer.findUnique({ where: { id } });
  if (!c) throw notFound("Customer");
  return db.customer.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    },
  });
}
