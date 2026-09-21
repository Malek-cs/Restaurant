import "server-only";
import { db } from "@/database/client";
import type { Prisma } from "@/generated/prisma/client";
import { conflict, notFound } from "@/lib/api/errors";
import { addDaysKey, startOfDayInTz } from "@/lib/dates";
import { formatMoney } from "@/utils/money";
import { createNotification } from "./notification.service";
import { getRestaurant } from "./restaurant.service";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface PaymentQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: PaymentStatus;
  method?: "CASH" | "ONLINE";
  from?: string;
  to?: string;
}

async function buildWhere(q: PaymentQuery, withStatus = true): Promise<Prisma.PaymentWhereInput> {
  const r = await getRestaurant();
  const and: Prisma.PaymentWhereInput[] = [];
  if (withStatus && q.status) and.push({ status: q.status });
  if (q.method) and.push({ method: q.method });
  if (q.from) and.push({ createdAt: { gte: startOfDayInTz(q.from, r.timezone) } });
  if (q.to) and.push({ createdAt: { lt: startOfDayInTz(addDaysKey(q.to, 1), r.timezone) } });
  if (q.q) {
    const term = q.q.replace(/^#/, "");
    const or: Prisma.PaymentWhereInput[] = [{ order: { customer: { name: { contains: term, mode: "insensitive" } } } }];
    if (/^\d{1,9}$/.test(term)) or.push({ order: { number: Number(term) } });
    and.push({ OR: or });
  }
  return { AND: and };
}

export async function listPayments(q: PaymentQuery) {
  const where = await buildWhere(q);
  const [total, rows, grouped] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { order: { select: { id: true, number: true, customer: { select: { id: true, name: true } } } } },
    }),
    db.payment.groupBy({ by: ["status"], where: await buildWhere(q, false), _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const summary: Record<string, { amount: number; count: number }> = {};
  for (const g of grouped) summary[g.status] = { amount: g._sum.amount ?? 0, count: g._count._all };
  return { total, rows, summary };
}

const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  PAID: ["REFUNDED"],
  FAILED: ["PENDING", "PAID"],
  REFUNDED: [],
};

export async function updatePaymentStatus(id: string, status: PaymentStatus) {
  const p = await db.payment.findUnique({ where: { id }, include: { order: { select: { id: true, number: true } } } });
  if (!p) throw notFound("Payment");
  if (!ALLOWED[p.status as PaymentStatus].includes(status)) {
    throw conflict(`A ${p.status.toLowerCase()} payment can't be changed to ${status.toLowerCase()}.`);
  }
  const now = new Date();
  const updated = await db.payment.update({
    where: { id },
    data: {
      status,
      paidAt: status === "PAID" ? now : p.paidAt,
      refundedAt: status === "REFUNDED" ? now : p.refundedAt,
    },
  });
  if (status === "PAID") {
    const r = await getRestaurant();
    await createNotification({
      type: "PAYMENT_RECEIVED",
      title: `Payment received for #${p.order.number}`,
      body: formatMoney(p.amount, r.currency),
      link: `/admin/orders/${p.order.id}`,
    });
  }
  return { payment: updated, from: p.status, orderNumber: p.order.number };
}

export { buildWhere as buildPaymentWhere };
