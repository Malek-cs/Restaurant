import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/database/client";
import { addDaysKey, resolveRange, type RangePreset, type ResolvedRange } from "@/lib/dates";
import { getRestaurant } from "./restaurant.service";

export interface Kpis {
  revenue: number;
  orders: number;
  completed: number;
  cancelled: number;
  totalOrders: number;
  averageOrder: number;
  tax: number;
}

export interface SeriesPoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  newCustomers: number;
}

export interface AnalyticsResult {
  range: { preset: RangePreset; label: string; from: string; to: string; bucket: "hour" | "day"; fromKey: string; toKey: string };
  currency: string;
  kpis: Kpis;
  previous: Kpis;
  pendingNow: number;
  newCustomers: number;
  previousNewCustomers: number;
  repeatCustomers: { customers: number; repeat: number; rate: number };
  cancellationRate: number;
  rating: { average: number; count: number };
  series: SeriesPoint[];
  byCategory: { name: string; revenue: number; quantity: number }[];
  topProducts: { name: string; revenue: number; quantity: number }[];
  paymentMethods: { method: string; orders: number; revenue: number }[];
  orderTypes: { type: string; orders: number; revenue: number }[];
}

const ts = (d: Date) => Prisma.sql`${d.toISOString()}::timestamp`;
/** Converts a UTC `timestamp` column to wall-clock time in the restaurant timezone (validated before interpolation). */
const local = (col: string, tz: string) => {
  if (!/^[A-Za-z_]+(\/[A-Za-z_+\-0-9]+)*$/.test(tz)) throw new Error("Invalid timezone");
  return Prisma.raw(`(${col} AT TIME ZONE 'UTC') AT TIME ZONE '${tz}'`);
};

async function kpisFor(from: Date, to: Date): Promise<Kpis> {
  const rows = await db.$queryRaw<
    { revenue: number; orders: number; completed: number; cancelled: number; total_orders: number; tax: number }[]
  >(Prisma.sql`
    SELECT
      COALESCE(SUM("total") FILTER (WHERE "status" <> 'CANCELLED'), 0)::float8 AS revenue,
      COUNT(*) FILTER (WHERE "status" <> 'CANCELLED')::int AS orders,
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::int AS completed,
      COUNT(*) FILTER (WHERE "status" = 'CANCELLED')::int AS cancelled,
      COUNT(*)::int AS total_orders,
      COALESCE(SUM("taxTotal") FILTER (WHERE "status" <> 'CANCELLED'), 0)::float8 AS tax
    FROM "Order"
    WHERE "placedAt" >= ${ts(from)} AND "placedAt" < ${ts(to)}`);
  const r = rows[0]!;
  return {
    revenue: r.revenue,
    orders: r.orders,
    completed: r.completed,
    cancelled: r.cancelled,
    totalOrders: r.total_orders,
    averageOrder: r.orders ? Math.round(r.revenue / r.orders) : 0,
    tax: r.tax,
  };
}

function bucketKeys(range: ResolvedRange): { key: string; label: string }[] {
  if (range.bucket === "hour") {
    return Array.from({ length: 24 }, (_, h) => {
      const hh = String(h).padStart(2, "0");
      const label = `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
      return { key: `${range.fromKey}T${hh}:00`, label };
    });
  }
  const out: { key: string; label: string }[] = [];
  let k = range.fromKey;
  while (k <= range.toKey) {
    const d = new Date(`${k}T00:00:00Z`);
    out.push({ key: k, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) });
    k = addDaysKey(k, 1);
  }
  return out;
}

export async function getAnalytics(q: { range: RangePreset; from?: string; to?: string }): Promise<AnalyticsResult> {
  const r = await getRestaurant();
  const range = resolveRange(q, r.timezone);
  const tz = r.timezone;
  const trunc = Prisma.raw(range.bucket === "hour" ? "'hour'" : "'day'");
  const fmt = Prisma.raw(range.bucket === "hour" ? `'YYYY-MM-DD"T"HH24:00'` : `'YYYY-MM-DD'`);
  const orderLocal = local(`o."placedAt"`, tz);
  const custLocal = local(`c."createdAt"`, tz);

  const [kpis, previous, pendingNow, newCustomers, previousNewCustomers, seriesRows, custRows, byCategory, topProducts, paymentMethods, orderTypes, repeat, rating] =
    await Promise.all([
      kpisFor(range.from, range.to),
      kpisFor(range.prevFrom, range.prevTo),
      db.order.count({ where: { status: { in: ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] } } }),
      db.customer.count({ where: { createdAt: { gte: range.from, lt: range.to } } }),
      db.customer.count({ where: { createdAt: { gte: range.prevFrom, lt: range.prevTo } } }),
      db.$queryRaw<{ bucket: string; orders: number; revenue: number }[]>(Prisma.sql`
        SELECT to_char(date_trunc(${trunc}, ${orderLocal}), ${fmt}) AS bucket,
               COUNT(*)::int AS orders, COALESCE(SUM(o."total"), 0)::float8 AS revenue
        FROM "Order" o
        WHERE o."placedAt" >= ${ts(range.from)} AND o."placedAt" < ${ts(range.to)} AND o."status" <> 'CANCELLED'
        GROUP BY 1 ORDER BY 1`),
      db.$queryRaw<{ bucket: string; n: number }[]>(Prisma.sql`
        SELECT to_char(date_trunc(${trunc}, ${custLocal}), ${fmt}) AS bucket, COUNT(*)::int AS n
        FROM "Customer" c
        WHERE c."createdAt" >= ${ts(range.from)} AND c."createdAt" < ${ts(range.to)}
        GROUP BY 1 ORDER BY 1`),
      db.$queryRaw<{ name: string; revenue: number; quantity: number }[]>(Prisma.sql`
        SELECT COALESCE(i."categoryName", 'Other') AS name, SUM(i."lineTotal")::float8 AS revenue, SUM(i."quantity")::int AS quantity
        FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
        WHERE o."placedAt" >= ${ts(range.from)} AND o."placedAt" < ${ts(range.to)} AND o."status" <> 'CANCELLED'
        GROUP BY 1 ORDER BY 2 DESC`),
      db.$queryRaw<{ name: string; revenue: number; quantity: number }[]>(Prisma.sql`
        SELECT i."productName" AS name, SUM(i."lineTotal")::float8 AS revenue, SUM(i."quantity")::int AS quantity
        FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
        WHERE o."placedAt" >= ${ts(range.from)} AND o."placedAt" < ${ts(range.to)} AND o."status" <> 'CANCELLED'
        GROUP BY 1 ORDER BY 3 DESC, 2 DESC LIMIT 10`),
      db.$queryRaw<{ method: string; orders: number; revenue: number }[]>(Prisma.sql`
        SELECT p."method"::text AS method, COUNT(*)::int AS orders, COALESCE(SUM(o."total"), 0)::float8 AS revenue
        FROM "Payment" p JOIN "Order" o ON o.id = p."orderId"
        WHERE o."placedAt" >= ${ts(range.from)} AND o."placedAt" < ${ts(range.to)} AND o."status" <> 'CANCELLED'
        GROUP BY 1 ORDER BY 3 DESC`),
      db.$queryRaw<{ type: string; orders: number; revenue: number }[]>(Prisma.sql`
        SELECT o."type"::text AS type, COUNT(*)::int AS orders, COALESCE(SUM(o."total"), 0)::float8 AS revenue
        FROM "Order" o
        WHERE o."placedAt" >= ${ts(range.from)} AND o."placedAt" < ${ts(range.to)} AND o."status" <> 'CANCELLED'
        GROUP BY 1 ORDER BY 3 DESC`),
      db.$queryRaw<{ customers: number; repeat: number }[]>(Prisma.sql`
        WITH ranged AS (
          SELECT DISTINCT o."customerId" FROM "Order" o
          WHERE o."placedAt" >= ${ts(range.from)} AND o."placedAt" < ${ts(range.to)} AND o."status" <> 'CANCELLED'
        )
        SELECT COUNT(*)::int AS customers,
               COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM "Order" x WHERE x."customerId" = r."customerId" AND x."status" <> 'CANCELLED') >= 2)::int AS repeat
        FROM ranged r`),
      db.review.aggregate({ where: { status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }),
    ]);

  const keys = bucketKeys(range);
  const sMap = new Map(seriesRows.map((s) => [s.bucket, s]));
  const cMap = new Map(custRows.map((s) => [s.bucket, s.n]));
  const series: SeriesPoint[] = keys.map((k) => ({
    key: k.key,
    label: k.label,
    revenue: sMap.get(k.key)?.revenue ?? 0,
    orders: sMap.get(k.key)?.orders ?? 0,
    newCustomers: cMap.get(k.key) ?? 0,
  }));

  const rp = repeat[0] ?? { customers: 0, repeat: 0 };
  return {
    range: {
      preset: range.preset,
      label: range.label,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      bucket: range.bucket,
      fromKey: range.fromKey,
      toKey: range.toKey,
    },
    currency: r.currency,
    kpis,
    previous,
    pendingNow,
    newCustomers,
    previousNewCustomers,
    repeatCustomers: { customers: rp.customers, repeat: rp.repeat, rate: rp.customers ? (rp.repeat / rp.customers) * 100 : 0 },
    cancellationRate: kpis.totalOrders ? (kpis.cancelled / kpis.totalOrders) * 100 : 0,
    rating: { average: rating._avg.rating ?? 0, count: rating._count._all },
    series,
    byCategory,
    topProducts,
    paymentMethods,
    orderTypes,
  };
}

/** Daily revenue breakdown used by the revenue report export. */
export async function getRevenueReport(q: { range: RangePreset; from?: string; to?: string }) {
  const r = await getRestaurant();
  const range = resolveRange(q, r.timezone);
  const orderLocal = local(`o."placedAt"`, r.timezone);
  const rows = await db.$queryRaw<
    { day: string; orders: number; revenue: number; discounts: number; tax: number; delivery: number; cancelled: number }[]
  >(Prisma.sql`
    SELECT to_char(date_trunc('day', ${orderLocal}), 'YYYY-MM-DD') AS day,
      COUNT(*) FILTER (WHERE o."status" <> 'CANCELLED')::int AS orders,
      COALESCE(SUM(o."total") FILTER (WHERE o."status" <> 'CANCELLED'), 0)::float8 AS revenue,
      COALESCE(SUM(o."discountTotal") FILTER (WHERE o."status" <> 'CANCELLED'), 0)::float8 AS discounts,
      COALESCE(SUM(o."taxTotal") FILTER (WHERE o."status" <> 'CANCELLED'), 0)::float8 AS tax,
      COALESCE(SUM(o."deliveryFee") FILTER (WHERE o."status" <> 'CANCELLED'), 0)::float8 AS delivery,
      COUNT(*) FILTER (WHERE o."status" = 'CANCELLED')::int AS cancelled
    FROM "Order" o
    WHERE o."placedAt" >= ${ts(range.from)} AND o."placedAt" < ${ts(range.to)}
    GROUP BY 1 ORDER BY 1`);
  return { range, currency: r.currency, rows };
}
