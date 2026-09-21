import "server-only";
import { db } from "@/database/client";
import type { Coupon } from "@/generated/prisma/client";
import { ApiError, notFound } from "@/lib/api/errors";
import { couponDiscount } from "@/lib/pricing";
import { normalizePhone } from "@/utils/phone";
import { formatMoney } from "@/utils/money";
import { startOfDayInTz } from "@/lib/dates";
import { getRestaurant } from "./restaurant.service";
import type { CouponInput } from "@/lib/validation/admin";

export type CouponStatus = "ACTIVE" | "INACTIVE" | "SCHEDULED" | "EXPIRED" | "EXHAUSTED";

export function couponStatus(c: Coupon, now = new Date()): CouponStatus {
  if (!c.isActive) return "INACTIVE";
  if (c.expiresAt && c.expiresAt < now) return "EXPIRED";
  if (c.startsAt && c.startsAt > now) return "SCHEDULED";
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return "EXHAUSTED";
  return "ACTIVE";
}

export async function listCoupons() {
  const rows = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((c) => ({ ...c, status: couponStatus(c) }));
}

async function dates(input: CouponInput) {
  const r = await getRestaurant();
  return {
    startsAt: input.startsAt ? startOfDayInTz(input.startsAt, r.timezone) : null,
    // expires at the end of the chosen day
    expiresAt: input.expiresAt ? new Date(startOfDayInTz(input.expiresAt, r.timezone).getTime() + 86_400_000 - 1) : null,
  };
}

function data(input: CouponInput, d: { startsAt: Date | null; expiresAt: Date | null }) {
  return {
    code: input.code,
    description: input.description || null,
    type: input.type,
    value: input.value,
    minOrder: input.minOrder,
    maxDiscount: input.type === "PERCENT" ? (input.maxDiscount ?? null) : null,
    startsAt: d.startsAt,
    expiresAt: d.expiresAt,
    usageLimit: input.usageLimit ?? null,
    perCustomerLimit: input.perCustomerLimit ?? null,
    isActive: input.isActive,
    isPublic: input.isPublic,
  };
}

export async function createCoupon(input: CouponInput) {
  return db.coupon.create({ data: data(input, await dates(input)) });
}

export async function updateCoupon(id: string, input: CouponInput) {
  const exists = await db.coupon.findUnique({ where: { id } });
  if (!exists) throw notFound("Coupon");
  return db.coupon.update({ where: { id }, data: data(input, await dates(input)) });
}

export async function deleteCoupon(id: string) {
  const c = await db.coupon.findUnique({ where: { id } });
  if (!c) throw notFound("Coupon");
  await db.coupon.delete({ where: { id } }); // orders keep couponCode as a snapshot
  return c;
}

export async function getPublicOffers() {
  const now = new Date();
  const rows = await db.coupon.findMany({ where: { isActive: true, isPublic: true }, orderBy: { createdAt: "desc" } });
  return rows.filter((c) => couponStatus(c, now) === "ACTIVE");
}

export class CouponError extends ApiError {
  constructor(message: string) {
    super(422, "COUPON_INVALID", message, { couponCode: message });
  }
}

/** Validates a coupon against a subtotal (and customer, when known). Throws CouponError with a user-friendly reason. */
export async function validateCoupon(rawCode: string, subtotal: number, phone?: string | null) {
  const code = rawCode.trim().toUpperCase();
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) throw new CouponError("That code isn't valid.");
  const status = couponStatus(coupon);
  if (status === "INACTIVE") throw new CouponError("That code isn't active.");
  if (status === "EXPIRED") throw new CouponError("That code has expired.");
  if (status === "SCHEDULED") throw new CouponError("That code isn't active yet.");
  if (status === "EXHAUSTED") throw new CouponError("That code has reached its usage limit.");
  const r = await getRestaurant();
  if (subtotal < coupon.minOrder) {
    throw new CouponError(`Add ${formatMoney(coupon.minOrder - subtotal, r.currency)} more to use ${coupon.code}.`);
  }
  if (coupon.perCustomerLimit != null && phone) {
    const customer = await db.customer.findUnique({ where: { phone: normalizePhone(phone) } });
    if (customer) {
      const used = await db.order.count({ where: { customerId: customer.id, couponId: coupon.id, status: { not: "CANCELLED" } } });
      if (used >= coupon.perCustomerLimit) throw new CouponError("You've already used this code the maximum number of times.");
    }
  }
  const discount = couponDiscount(coupon, subtotal);
  if (discount <= 0) throw new CouponError("That code doesn't apply to this order.");
  return { coupon, discount };
}
