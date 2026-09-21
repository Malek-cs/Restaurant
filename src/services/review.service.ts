import "server-only";
import { db } from "@/database/client";
import type { Prisma } from "@/generated/prisma/client";
import { conflict, notFound } from "@/lib/api/errors";
import { cached } from "@/lib/cache";
import { createNotification } from "./notification.service";

type ReviewStatus = "PENDING" | "APPROVED" | "HIDDEN";

export async function listReviews(q: { page: number; pageSize: number; status?: ReviewStatus; rating?: number; q?: string }) {
  const where: Prisma.ReviewWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.rating ? { rating: q.rating } : {}),
    ...(q.q ? { OR: [{ comment: { contains: q.q, mode: "insensitive" } }, { customer: { name: { contains: q.q, mode: "insensitive" } } }] } : {}),
  };
  const [total, rows, stats, byStatus, byRating] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { customer: { select: { id: true, name: true } }, order: { select: { id: true, number: true } } },
    }),
    db.review.aggregate({ where: { status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }),
    db.review.groupBy({ by: ["status"], _count: { _all: true } }),
    db.review.groupBy({ by: ["rating"], where: { status: "APPROVED" }, _count: { _all: true } }),
  ]);
  return {
    total,
    rows,
    summary: {
      average: stats._avg.rating ?? 0,
      approvedCount: stats._count._all,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      byRating: Object.fromEntries(byRating.map((s) => [s.rating, s._count._all])),
    },
  };
}

export async function setReviewStatus(id: string, status: ReviewStatus) {
  const r = await db.review.findUnique({ where: { id }, include: { customer: true } });
  if (!r) throw notFound("Review");
  const updated = await db.review.update({ where: { id }, data: { status } });
  return { review: updated, from: r.status, customerName: r.customer.name };
}

export async function deleteReview(id: string) {
  const r = await db.review.findUnique({ where: { id }, include: { customer: true } });
  if (!r) throw notFound("Review");
  await db.review.delete({ where: { id } });
  return r;
}

export async function getPublicReviews(limit = 6) {
  return cached(`public-reviews-${limit}`, ["reviews"], 60_000, async () => {
    const [rows, agg] = await Promise.all([
      db.review.findMany({
        where: { status: "APPROVED", comment: { not: null } },
        orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: { customer: { select: { name: true } } },
      }),
      db.review.aggregate({ where: { status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }),
    ]);
    return {
      average: agg._avg.rating ?? 0,
      count: agg._count._all,
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment!,
        // Show first name + initial only
        author: r.customer.name.split(" ").map((p, i) => (i === 0 ? p : `${p[0]}.`)).slice(0, 2).join(" "),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });
}

/** Customers can review once their order is completed. New reviews are held for moderation. */
export async function submitReview(orderId: string, input: { rating: number; comment?: string }) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { review: true, customer: true } });
  if (!order) throw notFound("Order");
  if (order.status !== "COMPLETED") throw conflict("You can leave a review once your order is completed.");
  if (order.review) throw conflict("You've already reviewed this order. Thank you!");
  const review = await db.review.create({
    data: { customerId: order.customerId, orderId, rating: input.rating, comment: input.comment?.trim() || null, status: "PENDING" },
  });
  await createNotification({
    type: "NEW_REVIEW",
    title: `New ${input.rating}★ review from ${order.customer.name}`,
    body: input.comment?.slice(0, 120),
    link: "/admin/reviews",
  });
  return review;
}
